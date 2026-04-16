export const extractErrorMessage = (error: any): string => {
  // Default fallback message
  let message = "An unexpected error occurred";

  try {
    // Handle different error response structures
    const errorData = error?.response?.data || error?.data || error;

    // Case 1: DRF validation errors with field-specific messages
    if (errorData && typeof errorData === "object") {
      const errorMessages: string[] = [];

      // Handle non_field_errors (general validation errors)
      if (
        errorData.non_field_errors &&
        Array.isArray(errorData.non_field_errors)
      ) {
        errorMessages.push(...errorData.non_field_errors);
      }

      // Handle field-specific errors
      Object.keys(errorData).forEach((field) => {
        if (field !== "non_field_errors" && Array.isArray(errorData[field])) {
          const fieldErrors = errorData[field].map((msg: string) =>
            field === "detail" ? msg : `${field}: ${msg}`
          );
          errorMessages.push(...fieldErrors);
        }
      });

      // Handle single detail message (common in DRF)
      if (errorData.detail && typeof errorData.detail === "string") {
        errorMessages.push(errorData.detail);
      }

      // Handle 'error' field (common in custom API responses)
      if (errorData.error && typeof errorData.error === "string") {
        errorMessages.push(errorData.error);
      }

      // If we found specific error messages, use them
      if (errorMessages.length > 0) {
        return errorMessages.join(". ");
      }
    }

    // Case 2: Handle string error responses
    if (typeof errorData === "string") {
      return errorData;
    }

    // Case 3: Handle error message from error object
    if (error?.message && typeof error.message === "string") {
      // Don't show generic axios messages
      if (
        !error.message.includes("status code") &&
        !error.message.includes("Network Error")
      ) {
        return error.message;
      }
    }

    // Case 4: HTTP status-based messages
    const status = error?.response?.status || error?.status;
    switch (status) {
      case 400:
        return "Invalid data provided. Please check your input and try again.";
      case 401:
        return "Authentication required. Please log in and try again.";
      case 403:
        return "You don't have permission to perform this action.";
      case 404:
        return "The requested resource was not found.";
      case 409:
        return "This action conflicts with existing data.";
      case 422:
        return "The data provided is invalid. Please check your input.";
      case 429:
        return "Too many requests. Please wait a moment and try again.";
      case 500:
        return "Server error. Please try again later.";
      case 502:
      case 503:
      case 504:
        return "Service temporarily unavailable. Please try again later.";
      default:
        return message;
    }
  } catch (e) {
    // If error parsing fails, return fallback
    console.warn("Error parsing API error response:", e);
    return message;
  }
};

export const extractFieldErrors = (error: any): Record<string, string[]> => {
  const fieldErrors: Record<string, string[]> = {};

  try {
    const errorData = error?.response?.data || error?.data || error;

    if (errorData && typeof errorData === "object") {
      Object.keys(errorData).forEach((field) => {
        if (field !== "non_field_errors" && Array.isArray(errorData[field])) {
          fieldErrors[field] = errorData[field];
        }
      });
    }
  } catch (e) {
    console.warn("Error parsing field errors:", e);
  }

  return fieldErrors;
};
