"""Event-triggered auto-completion of finished styles on a line.

Covers the rule that replaced the old continuous "input == output at query time"
hide, which false-hid live styles whose fed batch was momentarily caught up.

The scenarios here map 1:1 to the behaviours the rule has to get right:

  * incremental batches                 -> must NOT hide mid-style
  * new style assigned, old one done    -> must hide
  * new style assigned, old one pending -> must NOT hide
  * late output catching up             -> must hide, via the QC re-trigger
  * re-issuing a hidden style           -> un-hides AUTO, never MANUAL
  * several pending styles on one line  -> judged independently
"""
from datetime import timedelta

import pytest
from django.utils import timezone

from tracking.models import (
    Bundle,
    LineStyleCompletion,
    QualityCheck,
    Scan,
    Scanner,
)
from tracking.models.constants import (
    CompletionSource,
    GarmentStatus,
    LineType,
    QualityCheckCheckpoint,
    QualityCheckStatus,
    ScanEventType,
    ScannerType,
)
from tracking.services import line_visibility as lv
from tracking.services.line_completion import (
    auto_complete_superseded_styles,
    clear_auto_completions_for_style,
    handle_style_assigned_to_line,
    reconcile_order_completion,
    sweep_auto_completions,
)
from tracking.tests.conftest import (
    BundleFactory,
    OrderFactory,
    PartFactory,
    ProductionLineFactory,
    StyleFactory,
)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _qc_scanner(line):
    return Scanner.objects.create(
        name=f"QC-{line.id}",
        scanner_type=ScannerType.SEWING_QC_CHECK,
        production_line=line,
    )


def _issue(order, part, line, qty, when=None):
    """Issue a bundle of ``qty`` for ``order`` onto ``line``."""
    b = BundleFactory(
        order=order, part=part, garment_quantity=qty, assigned_sewing_line=line
    )
    Bundle.objects.filter(pk=b.pk).update(issued_at=when or timezone.now())
    return b


def _pass_qc(order, line, scanner, count):
    """Give ``count`` of ``order``'s not-yet-passed garments a sewing-QC PASS."""
    garments = list(
        order.garments.exclude(status=GarmentStatus.SEWING_QC_PASS).order_by(
            "sequence_number"
        )[:count]
    )
    assert len(garments) == count, f"needed {count} garments, had {len(garments)}"
    for g in garments:
        g.sewing_line = line
        g.status = GarmentStatus.SEWING_QC_PASS
        g.save(update_fields=["sewing_line", "status"])
        QualityCheck.objects.create(
            garment=g,
            status=QualityCheckStatus.PASS,
            checkpoint=QualityCheckCheckpoint.SEWING_QC,
        )
        Scan.objects.create(
            garment=g, scanner=scanner, event_type=ScanEventType.SEWING_QUALITY_CHECK
        )
    return garments


# ---------------------------------------------------------------------------
# 1. Incremental batches — the false-hide this whole change exists to prevent
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestIncrementalBatchesDoNotHide:
    def test_input_equals_output_midstyle_does_not_hide(self):
        """60 in, 60 out, 100 more still to come — must stay visible.

        This is the exact case the old continuous rule got wrong.
        """
        line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = _qc_scanner(line)
        part = PartFactory()
        order = OrderFactory(style=StyleFactory(), quantity=160)

        _issue(order, part, line, 60)
        _pass_qc(order, line, scanner, 60)

        # The pure predicate says "complete"...
        io = lv.compute_line_input_output(line, [order])
        assert lv.is_style_complete(*io[order.id]) is True

        # ...but nothing hides it, because no new style was assigned.
        assert order.id not in lv.get_hidden_order_ids_for_line(line)
        assert order.id not in lv.get_inactive_order_ids_for_line(line)
        assert not LineStyleCompletion.objects.filter(order=order).exists()

    def test_second_batch_arrives_and_style_still_visible(self):
        line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = _qc_scanner(line)
        part = PartFactory()
        order = OrderFactory(style=StyleFactory(), quantity=160)

        _issue(order, part, line, 60)
        _pass_qc(order, line, scanner, 60)
        # Days later the next 100 are fed.
        _issue(order, part, line, 100)

        io = lv.compute_line_input_output(line, [order])
        assert io[order.id] == (160, 60)
        assert order.id not in lv.get_hidden_order_ids_for_line(line)

    def test_active_style_is_never_auto_completed_even_when_complete(self):
        """The line's own active style is exempt by construction."""
        line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = _qc_scanner(line)
        part = PartFactory()
        style = StyleFactory()
        order = OrderFactory(style=style, quantity=100)

        _issue(order, part, line, 50)
        _pass_qc(order, line, scanner, 50)

        assert auto_complete_superseded_styles(line) == []
        assert reconcile_order_completion(line, order) is False
        assert order.id not in lv.get_hidden_order_ids_for_line(line)


# ---------------------------------------------------------------------------
# 2 & 3. New-style assignment trigger
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestNewStyleAssignmentTrigger:
    def _two_styles(self, old_input, old_output):
        line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = _qc_scanner(line)
        part = PartFactory()
        style_old, style_new = StyleFactory(), StyleFactory()
        order_old = OrderFactory(style=style_old, quantity=500)
        order_new = OrderFactory(style=style_new, quantity=500)

        now = timezone.now()
        _issue(order_old, part, line, old_input, when=now - timedelta(hours=3))
        _pass_qc(order_old, line, scanner, old_output)
        _issue(order_new, part, line, 40, when=now)
        return line, order_old, order_new, style_new

    def test_completed_old_style_is_auto_hidden(self):
        line, order_old, _new, style_new = self._two_styles(50, 50)

        written = auto_complete_superseded_styles(line)

        assert written == [order_old.id]
        rec = LineStyleCompletion.objects.get(production_line=line, order=order_old)
        assert rec.source == CompletionSource.AUTO
        assert rec.completed_by is None
        assert order_old.id in lv.get_hidden_order_ids_for_line(line)

    def test_pending_old_style_is_not_hidden(self):
        """450 of 500 output when superseded — leftover work still pending."""
        line, order_old, _new, _s = self._two_styles(50, 45)

        assert auto_complete_superseded_styles(line) == []
        assert order_old.id not in lv.get_hidden_order_ids_for_line(line)

    def test_old_style_with_no_input_is_not_hidden(self):
        """A style staged but never fed must not be auto-completed (0 input)."""
        line = ProductionLineFactory(line_type=LineType.SEWING)
        part = PartFactory()
        style_old, style_new = StyleFactory(), StyleFactory()
        order_old = OrderFactory(style=style_old, quantity=100)
        order_new = OrderFactory(style=style_new, quantity=100)

        # order_old has garments/activity but no *issued* bundle -> input 0.
        b = BundleFactory(
            order=order_old, part=part, garment_quantity=30, assigned_sewing_line=line
        )
        Bundle.objects.filter(pk=b.pk).update(issued_at=None)
        _issue(order_new, part, line, 40)

        assert auto_complete_superseded_styles(line) == []
        assert order_old.id not in lv.get_hidden_order_ids_for_line(line)

    def test_trigger_is_idempotent(self):
        line, order_old, _n, _s = self._two_styles(50, 50)

        first = auto_complete_superseded_styles(line)
        second = auto_complete_superseded_styles(line)

        assert first == [order_old.id]
        assert second == []  # already recorded, not re-written
        assert LineStyleCompletion.objects.filter(order=order_old).count() == 1

    def test_existing_manual_completion_is_not_downgraded(self):
        line, order_old, _n, _s = self._two_styles(50, 50)
        LineStyleCompletion.objects.create(
            production_line=line, order=order_old, source=CompletionSource.MANUAL
        )

        assert auto_complete_superseded_styles(line) == []
        rec = LineStyleCompletion.objects.get(production_line=line, order=order_old)
        assert rec.source == CompletionSource.MANUAL


# ---------------------------------------------------------------------------
# 4. Late output catching up (the QC re-trigger)
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestLateOutputCatchUp:
    def test_output_catching_up_after_supersede_hides_the_style(self):
        line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = _qc_scanner(line)
        part = PartFactory()
        style_old, style_new = StyleFactory(), StyleFactory()
        order_old = OrderFactory(style=style_old, quantity=500)
        order_new = OrderFactory(style=style_new, quantity=500)

        now = timezone.now()
        _issue(order_old, part, line, 50, when=now - timedelta(hours=3))
        _pass_qc(order_old, line, scanner, 45)
        _issue(order_new, part, line, 40, when=now)

        # At assignment time it is 45/50 -> correctly left visible.
        assert auto_complete_superseded_styles(line) == []
        assert order_old.id not in lv.get_hidden_order_ids_for_line(line)

        # The last 5 trickle through QC over the following days.
        _pass_qc(order_old, line, scanner, 5)

        # The re-trigger notices.
        assert reconcile_order_completion(line, order_old) is True
        rec = LineStyleCompletion.objects.get(production_line=line, order=order_old)
        assert rec.source == CompletionSource.AUTO
        assert order_old.id in lv.get_hidden_order_ids_for_line(line)

    def test_retrigger_is_a_noop_while_still_pending(self):
        line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = _qc_scanner(line)
        part = PartFactory()
        order_old = OrderFactory(style=StyleFactory(), quantity=500)
        order_new = OrderFactory(style=StyleFactory(), quantity=500)

        now = timezone.now()
        _issue(order_old, part, line, 50, when=now - timedelta(hours=3))
        _pass_qc(order_old, line, scanner, 30)
        _issue(order_new, part, line, 40, when=now)

        assert reconcile_order_completion(line, order_old) is False
        assert order_old.id not in lv.get_hidden_order_ids_for_line(line)


# ---------------------------------------------------------------------------
# 5. Re-issuing a previously hidden style
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestReIssuingAHiddenStyle:
    def _hidden_old_style(self):
        line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = _qc_scanner(line)
        part = PartFactory()
        style_old, style_new = StyleFactory(), StyleFactory()
        order_old = OrderFactory(style=style_old, quantity=500)
        order_new = OrderFactory(style=style_new, quantity=500)

        now = timezone.now()
        _issue(order_old, part, line, 50, when=now - timedelta(hours=3))
        _pass_qc(order_old, line, scanner, 50)
        _issue(order_new, part, line, 40, when=now)
        auto_complete_superseded_styles(line)
        assert order_old.id in lv.get_hidden_order_ids_for_line(line)
        return line, part, order_old, style_old

    def test_reissuing_clears_the_auto_completion(self):
        line, part, order_old, style_old = self._hidden_old_style()

        # The old style is fed again -> it becomes active and must reappear.
        handle_style_assigned_to_line(line, style_old.id)

        assert not LineStyleCompletion.objects.filter(order=order_old).exists()
        assert order_old.id not in lv.get_hidden_order_ids_for_line(line)

    def test_reissuing_does_not_clear_a_manual_completion(self):
        line, part, order_old, style_old = self._hidden_old_style()
        # Operator's explicit decision replaces the auto row.
        LineStyleCompletion.objects.filter(order=order_old).update(
            source=CompletionSource.MANUAL
        )

        handle_style_assigned_to_line(line, style_old.id)

        rec = LineStyleCompletion.objects.get(production_line=line, order=order_old)
        assert rec.source == CompletionSource.MANUAL
        assert order_old.id in lv.get_hidden_order_ids_for_line(line)

    def test_clear_is_scoped_to_the_line(self):
        line, part, order_old, style_old = self._hidden_old_style()
        other_line = ProductionLineFactory(line_type=LineType.SEWING)
        LineStyleCompletion.objects.create(
            production_line=other_line, order=order_old, source=CompletionSource.AUTO
        )

        clear_auto_completions_for_style(line, style_old.id)

        assert not LineStyleCompletion.objects.filter(
            production_line=line, order=order_old
        ).exists()
        assert LineStyleCompletion.objects.filter(
            production_line=other_line, order=order_old
        ).exists()


# ---------------------------------------------------------------------------
# 6. Several pending styles on one line, judged independently
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestMultiplePendingStyles:
    def test_each_old_style_is_evaluated_on_its_own(self):
        line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = _qc_scanner(line)
        part = PartFactory()
        s_done, s_pending, s_new = StyleFactory(), StyleFactory(), StyleFactory()
        o_done = OrderFactory(style=s_done, quantity=500)
        o_pending = OrderFactory(style=s_pending, quantity=500)
        o_new = OrderFactory(style=s_new, quantity=500)

        now = timezone.now()
        _issue(o_done, part, line, 40, when=now - timedelta(hours=5))
        _pass_qc(o_done, line, scanner, 40)          # complete
        _issue(o_pending, part, line, 40, when=now - timedelta(hours=3))
        _pass_qc(o_pending, line, scanner, 25)       # still pending
        _issue(o_new, part, line, 30, when=now)      # active

        written = auto_complete_superseded_styles(line)

        assert written == [o_done.id]
        hidden = lv.get_hidden_order_ids_for_line(line)
        assert o_done.id in hidden
        assert o_pending.id not in hidden
        assert o_new.id not in hidden

    def test_sweep_covers_multiple_lines_independently(self):
        """The nightly sweep is the per-line trigger applied to every line."""
        lines = []
        finished, running = [], []
        for _ in range(2):
            line = ProductionLineFactory(line_type=LineType.SEWING)
            scanner = _qc_scanner(line)
            part = PartFactory()
            o_old = OrderFactory(style=StyleFactory(), quantity=500)
            o_new = OrderFactory(style=StyleFactory(), quantity=500)
            now = timezone.now()
            _issue(o_old, part, line, 40, when=now - timedelta(hours=3))
            _pass_qc(o_old, line, scanner, 40)
            _issue(o_new, part, line, 30, when=now)
            lines.append(line)
            finished.append(o_old)
            running.append(o_new)

        results = sweep_auto_completions(lines=lines)

        assert [results[l.name] for l in lines] == [[o.id] for o in finished]
        for line, o_done, o_new in zip(lines, finished, running):
            hidden = lv.get_hidden_order_ids_for_line(line)
            assert o_done.id in hidden
            assert o_new.id not in hidden

    def test_sibling_sizes_of_one_style_are_judged_separately(self):
        """Two orders share a style; only the finished one is completed."""
        line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = _qc_scanner(line)
        part = PartFactory()
        style_old, style_new = StyleFactory(), StyleFactory()
        o_a = OrderFactory(style=style_old, quantity=500)
        o_b = OrderFactory(style=style_old, quantity=500)
        o_new = OrderFactory(style=style_new, quantity=500)

        now = timezone.now()
        _issue(o_a, part, line, 40, when=now - timedelta(hours=4))
        _pass_qc(o_a, line, scanner, 40)     # size A finished
        _issue(o_b, part, line, 40, when=now - timedelta(hours=3))
        _pass_qc(o_b, line, scanner, 10)     # size B still running
        _issue(o_new, part, line, 30, when=now)

        written = auto_complete_superseded_styles(line)

        assert written == [o_a.id]
        hidden = lv.get_hidden_order_ids_for_line(line)
        assert o_a.id in hidden
        assert o_b.id not in hidden


# ---------------------------------------------------------------------------
# 7. The nightly sweep — safety net for lines with no triggering event
# ---------------------------------------------------------------------------

@pytest.mark.django_db
class TestNightlySweep:
    def _idle_line_with_finished_style(self):
        """A line whose old style finished and where nothing has happened since."""
        line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = _qc_scanner(line)
        part = PartFactory()
        o_old = OrderFactory(style=StyleFactory(), quantity=500)
        o_new = OrderFactory(style=StyleFactory(), quantity=500)
        now = timezone.now()
        _issue(o_old, part, line, 40, when=now - timedelta(hours=3))
        _pass_qc(o_old, line, scanner, 40)
        _issue(o_new, part, line, 30, when=now)
        return line, o_old

    def test_dry_run_writes_nothing_but_reports_the_same_ids(self):
        """--dry-run must be the same code path, minus the writes."""
        line, o_old = self._idle_line_with_finished_style()

        preview = sweep_auto_completions(lines=[line], dry_run=True)

        assert preview[line.name] == [o_old.id]
        assert not LineStyleCompletion.objects.filter(order=o_old).exists()

        applied = sweep_auto_completions(lines=[line])

        assert applied == preview  # identical decision, now persisted
        assert LineStyleCompletion.objects.filter(order=o_old).exists()

    def test_sweep_only_ever_creates_auto_rows(self):
        line, o_old = self._idle_line_with_finished_style()

        sweep_auto_completions(lines=[line])

        rec = LineStyleCompletion.objects.get(production_line=line, order=o_old)
        assert rec.source == CompletionSource.AUTO
        assert rec.completed_by is None

    def test_sweep_never_modifies_or_deletes_a_manual_row(self):
        line, o_old = self._idle_line_with_finished_style()
        manual = LineStyleCompletion.objects.create(
            production_line=line,
            order=o_old,
            source=CompletionSource.MANUAL,
            notes="operator note",
        )

        assert sweep_auto_completions(lines=[line])[line.name] == []

        manual.refresh_from_db()
        assert manual.source == CompletionSource.MANUAL
        assert manual.notes == "operator note"
        assert LineStyleCompletion.objects.filter(order=o_old).count() == 1

    def test_sweep_is_idempotent(self):
        line, o_old = self._idle_line_with_finished_style()

        first = sweep_auto_completions(lines=[line])[line.name]
        second = sweep_auto_completions(lines=[line])[line.name]

        assert first == [o_old.id]
        assert second == []
        assert LineStyleCompletion.objects.filter(order=o_old).count() == 1

    def test_sweep_does_not_touch_the_active_style(self):
        """An idle line whose *active* style is fully output stays visible."""
        line = ProductionLineFactory(line_type=LineType.SEWING)
        scanner = _qc_scanner(line)
        part = PartFactory()
        order = OrderFactory(style=StyleFactory(), quantity=500)
        _issue(order, part, line, 40)
        _pass_qc(order, line, scanner, 40)

        assert sweep_auto_completions(lines=[line])[line.name] == []
        assert order.id not in lv.get_hidden_order_ids_for_line(line)

    def test_one_failing_line_does_not_abort_the_sweep(self, monkeypatch):
        """A per-line error is logged and skipped, not propagated."""
        good_line, o_old = self._idle_line_with_finished_style()
        bad_line = ProductionLineFactory(line_type=LineType.SEWING)

        real = auto_complete_superseded_styles

        def _boom(line, **kwargs):
            if line.id == bad_line.id:
                raise RuntimeError("simulated failure")
            return real(line, **kwargs)

        monkeypatch.setattr(
            "tracking.services.line_completion.auto_complete_superseded_styles", _boom
        )

        results = sweep_auto_completions(lines=[bad_line, good_line])

        assert results[bad_line.name] == []
        assert results[good_line.name] == [o_old.id]

    def test_management_command_runs(self):
        """The command wires through to the service (smoke test)."""
        from io import StringIO

        from django.core.management import call_command

        line, o_old = self._idle_line_with_finished_style()

        out = StringIO()
        call_command("sweep_line_completions", "--dry-run", stdout=out)
        assert "DRY RUN" in out.getvalue()
        assert not LineStyleCompletion.objects.filter(order=o_old).exists()

        out = StringIO()
        call_command("sweep_line_completions", stdout=out)
        assert LineStyleCompletion.objects.filter(
            order=o_old, source=CompletionSource.AUTO
        ).exists()
