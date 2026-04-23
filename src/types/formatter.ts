import type { GeneratedItinerary, PolicyValidation, RateQuote } from "./query-classification";

/**
 * Base formatter output interface
 */
export interface FormatterOutput {
  formatted_response: string;
  suggested_actions: string[];
  tokens_used: number;
}

/**
 * Input for PolicyBlockedFormatter
 */
export interface PolicyBlockedFormatterInput {
  policy: PolicyValidation;
  query: string;
}

/**
 * Input for ErrorFormatter
 */
export interface ErrorFormatterInput {
  query: string;
  missingFields?: string[];
  errors?: string[];
}

/**
 * Input for SuccessFormatter
 */
export interface SuccessFormatterInput {
  itinerary?: GeneratedItinerary;
  rates?: RateQuote;
  query: string;
  context: {
    today: Date;
    userModel: string;
  };
}

/**
 * Generic formatter interface
 */
export interface IFormatter<TInput> {
  format(input: TInput): Promise<FormatterOutput>;
}
