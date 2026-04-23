/**
 * Travel Quote Orchestrator Service
 *
 * This service orchestrates the entire flow of processing travel queries:
 * 1. Query Understanding & Categorization
 * 2. DMC Settings Validation
 * 3. Policy Checking
 * 4. Itinerary Generation (always first for quotes)
 * 5. Service Rate Fetching
 */

import { intelligentQueryUnderstandingService } from './intelligent-query-understanding.service';
import { dmcSettingsService } from './dmc-settings.service';
import { serviceRateService } from './service-rate.service';
import { itineraryGenerationService } from './itinerary-generation.service';
import type {
  TravelQueryInfo,
  DMCSettings,
  PolicyValidation,
  RateQuote,
  GeneratedItinerary
} from '@/types/query-classification';
import { QueryCategory } from '@/types/query-classification';

export interface TravelQuoteRequest {
  query: string;
  dmcId: string;
  userId?: string;
  conversationHistory?: Array<{ role: string; content: string }>; // ✅ Add conversation context
  userSelectedModel?: string; // ✅ Model selected by user on frontend
  options?: {
    skipItineraryGeneration?: boolean;
    forceNewItinerary?: boolean;
    includeExactPackageNames?: boolean;
    includeHotelRoomNames?: boolean;
  };
}

export interface TravelQuoteResponse {
  success: boolean;
  queryInfo: TravelQueryInfo;
  dmcSettings?: DMCSettings;
  policyValidation?: PolicyValidation;
  itinerary?: GeneratedItinerary;
  rateQuote?: RateQuote;
  recommendations?: string[];
  errors?: string[];
  warnings?: string[];
  processingSteps: ProcessingStep[];
  usage?: {
    total_tokens: number;
    breakdown: {
      query_classification?: number;
      policy_validation?: number;
      itinerary_generation?: number;
    };
  };
}

export interface ProcessingStep {
  step: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message?: string;
  duration?: number;
  data?: any;
  tokens?: number; // Track tokens used in this step
}

export class TravelQuoteOrchestratorService {
  /**
   * Main method to process travel quote requests
   */
  public async processTravelQuote(request: TravelQuoteRequest): Promise<TravelQuoteResponse> {
    console.log('[TravelQuoteOrchestrator] Processing travel quote request:', {
      query: request.query,
      dmcId: request.dmcId
    });

    const processingSteps: ProcessingStep[] = [
      { step: 'DMC Settings Fetch', status: 'pending' },
      { step: 'Query Classification', status: 'pending' },
      { step: 'Required Fields Validation', status: 'pending' },
      { step: 'Policy Validation', status: 'pending' },
      { step: 'Itinerary Generation', status: 'pending' },
      { step: 'Service Rate Fetching', status: 'pending' }
    ];

    const response: TravelQuoteResponse = {
      success: false,
      queryInfo: {} as TravelQueryInfo,
      processingSteps
    };

    try {
      // Step 1: DMC Settings Fetch (get countryServing for query classification)
      const dmcSettingsStep = await this.performDMCSettingsFetch(request.dmcId);
      processingSteps[0] = dmcSettingsStep;
      response.dmcSettings = dmcSettingsStep.data?.settings;

      if (dmcSettingsStep.status === 'failed') {
        response.errors = ['Failed to fetch DMC settings'];
        return response;
      }

      // Step 2: Query Classification (using LLM with DMC context)
      const queryInfoStep = await this.performQueryClassification(
        request.query,
        request.conversationHistory || [],
        dmcSettingsStep.data?.settings // ✅ Pass DMC settings for destination inference
      );
      processingSteps[1] = queryInfoStep;
      response.queryInfo = queryInfoStep.data;

      if (queryInfoStep.status === 'failed') {
        response.errors = ['Failed to classify query'];
        return response;
      }

      // Step 3: Required Fields Validation
      const requiredFieldsStep = this.performRequiredFieldsValidation(queryInfoStep.data);
      processingSteps[2] = requiredFieldsStep;

      if (requiredFieldsStep.status === 'failed') {
        response.errors = [requiredFieldsStep.message || 'Missing required information'];
        response.warnings = requiredFieldsStep.data?.missing || [];
        return response;
      }

      // Step 4: Policy Validation
      // ✅ CRITICAL: Skip policy validation for itinerary-only requests (PLAN.md Step 5)
      // For itinerary requests: Generate itinerary → Show → Wait for confirmation
      // → ONLY validate policies when user asks for pricing
      const shouldValidatePolicy = !queryInfoStep.data.isDetailedItinerary;
      const shouldGenerateItinerary = this.shouldGenerateItinerary(queryInfoStep.data, request.options);
      const shouldFetchRates = !queryInfoStep.data.isDetailedItinerary;

      // ✅ PARALLEL PROCESSING: Run policy validation, itinerary generation, and rate fetching in parallel
      console.log('[TravelQuoteOrchestrator] Starting parallel processing of policy validation, itinerary generation, and rate fetching');

      const [policyValidationResult, itineraryResult, rateResult] = await Promise.allSettled([
        // Policy validation
        shouldValidatePolicy
          ? this.performPolicyValidation(
              request.dmcId,
              queryInfoStep.data,
              request.query,
              dmcSettingsStep.data!.settings!,
              request.userSelectedModel
            )
          : Promise.resolve({
              step: 'Policy Validation',
              status: 'completed' as const,
              message: 'Skipped - itinerary-only request (will validate when pricing is requested)',
              duration: 0
            }),

        // Itinerary generation
        shouldGenerateItinerary
          ? this.performItineraryGeneration(
              queryInfoStep.data,
              request.dmcId,
              dmcSettingsStep.data!.settings!,
              request.options,
              request.userSelectedModel
            )
          : Promise.resolve({
              step: 'Itinerary Generation',
              status: 'completed' as const,
              message: 'Skipped - not a quote request',
              duration: 0
            }),

        // Service rate fetching
        shouldFetchRates
          ? this.performServiceRateFetching(
              queryInfoStep.data,
              request.dmcId,
              dmcSettingsStep.data!.settings!
            )
          : Promise.resolve({
              step: 'Service Rate Fetching',
              status: 'completed' as const,
              message: 'Skipped - itinerary-only request (will fetch rates when pricing is requested)',
              duration: 0
            })
      ]);

      // Process policy validation result
      if (policyValidationResult.status === 'fulfilled') {
        const policyValidationStep = policyValidationResult.value;
        processingSteps[3] = policyValidationStep;
        response.policyValidation = 'data' in policyValidationStep ? policyValidationStep.data : undefined;

        // ✅ Check if validation threw an error (exception)
        if (policyValidationStep.status === 'failed') {
          response.errors = ['Failed to validate policy (system error)'];
          return response;
        }

        // ✅ Check if policy blocked the query (validation succeeded but query not allowed)
        if (shouldValidatePolicy && 'data' in policyValidationStep && !policyValidationStep.data?.allowed) {
          response.errors = [policyValidationStep.data?.message || 'Query not allowed by DMC policy'];
          return response;
        }
      } else {
        console.error('[TravelQuoteOrchestrator] Policy validation rejected:', policyValidationResult.reason);
        processingSteps[3] = {
          step: 'Policy Validation',
          status: 'failed',
          message: 'Policy validation failed unexpectedly',
          duration: 0
        };
        response.errors = ['Failed to validate policy (system error)'];
        return response;
      }

      // Process itinerary generation result
      if (itineraryResult.status === 'fulfilled') {
        const itineraryStep = itineraryResult.value;
        processingSteps[4] = itineraryStep;
        response.itinerary = 'data' in itineraryStep ? itineraryStep.data : undefined;

        if (shouldGenerateItinerary && itineraryStep.status === 'failed') {
          response.warnings = ['Failed to generate itinerary, proceeding with basic rates'];
        }
      } else {
        console.error('[TravelQuoteOrchestrator] Itinerary generation rejected:', itineraryResult.reason);
        processingSteps[4] = {
          step: 'Itinerary Generation',
          status: 'failed',
          message: 'Itinerary generation failed unexpectedly',
          duration: 0
        };
        response.warnings = ['Failed to generate itinerary, proceeding with basic rates'];
      }

      // Process service rate fetching result
      if (rateResult.status === 'fulfilled') {
        const rateStep = rateResult.value;
        processingSteps[5] = rateStep;
        response.rateQuote = 'data' in rateStep ? rateStep.data : undefined;

        if (shouldFetchRates && rateStep.status === 'failed') {
          response.warnings = [...(response.warnings || []), 'Failed to fetch service rates'];
        }
      } else {
        console.error('[TravelQuoteOrchestrator] Service rate fetching rejected:', rateResult.reason);
        processingSteps[5] = {
          step: 'Service Rate Fetching',
          status: 'failed',
          message: 'Service rate fetching failed unexpectedly',
          duration: 0
        };
        response.warnings = [...(response.warnings || []), 'Failed to fetch service rates'];
      }

      console.log('[TravelQuoteOrchestrator] Parallel processing completed:', {
        policyValidation: processingSteps[3].status,
        itineraryGeneration: processingSteps[4].status,
        rateFetching: processingSteps[5].status
      });

      // Generate recommendations
      response.recommendations = this.generateRecommendations(response);

      // Mark as success if we have meaningful results
      response.success = !!(response.itinerary || response.rateQuote);

      // Sum all token usage from processing steps
      const tokenBreakdown = {
        query_classification: processingSteps[1]?.tokens || 0,
        policy_validation: processingSteps[3]?.tokens || 0,
        itinerary_generation: processingSteps[4]?.tokens || 0,
      };
      const totalTokens =
        tokenBreakdown.query_classification +
        tokenBreakdown.policy_validation +
        tokenBreakdown.itinerary_generation;

      if (totalTokens > 0) {
        response.usage = {
          total_tokens: totalTokens,
          breakdown: tokenBreakdown
        };
      }

      console.log('[TravelQuoteOrchestrator] Travel quote processing completed:', {
        success: response.success,
        hasItinerary: !!response.itinerary,
        hasRateQuote: !!response.rateQuote,
        errors: response.errors?.length,
        warnings: response.warnings?.length,
        totalTokens
      });

      return response;
    } catch (error) {
      console.error('[TravelQuoteOrchestrator] Error processing travel quote:', error);
      response.errors = ['Unexpected error occurred during processing'];
      response.success = false;
      return response;
    }
  }

  /**
   * Perform required fields validation
   * Must have: Destination, Dates (or duration), and Pax
   */
  private performRequiredFieldsValidation(queryInfo: TravelQueryInfo): ProcessingStep {
    const startTime = Date.now();
    const missing: string[] = [];

    // Check destination
    if (!queryInfo.destination) {
      missing.push('destination');
    }

    // Check dates or duration
    if (!queryInfo.dates?.startDate && !queryInfo.duration?.nights) {
      missing.push('dates or duration');
    }

    // Check travelers (must have at least adults)
    if (!queryInfo.travelers?.adults || queryInfo.travelers.adults === 0) {
      missing.push('number of travelers');
    }

    if (missing.length > 0) {
      return {
        step: 'Required Fields Validation',
        status: 'failed',
        message: `Please provide: ${missing.join(', ')}`,
        duration: Date.now() - startTime,
        data: { missing }
      };
    }

    return {
      step: 'Required Fields Validation',
      status: 'completed',
      message: 'All required fields present',
      duration: Date.now() - startTime
    };
  }

  /**
   * Perform query classification using LLM with conversation context and DMC settings
   */
  private async performQueryClassification(
    query: string,
    conversationHistory: Array<{ role: string; content: string }>,
    dmcSettings?: DMCSettings
  ): Promise<ProcessingStep> {
    const startTime = Date.now();

    try {
      console.log('[TravelQuoteOrchestrator] Understanding query with LLM:', query);
      console.log(`[TravelQuoteOrchestrator] Conversation context: ${conversationHistory.length} messages`);
      console.log(`[TravelQuoteOrchestrator] DMC context: countryServing =`, dmcSettings?.countryServing);

      // ✅ Use LLM-based intelligent understanding WITH DMC context and policy flags
      const queryInfo = await intelligentQueryUnderstandingService.understandQuery(
        query,
        conversationHistory,
        dmcSettings?.countryServing, // ✅ Pass countryServing for destination inference
        {
          has_hotel_policy: !!dmcSettings?.default_hotel_policy,
          has_tour_policy: !!dmcSettings?.default_tour_policy,
          has_transfer_policy: !!dmcSettings?.default_transfer_policy,
        }
      );

      console.log('[TravelQuoteOrchestrator] LLM classified query as:', queryInfo.category);

      // Log token usage
      const tokens = queryInfo.usage?.total_tokens || 0;
      if (queryInfo.usage) {
        console.log('[TravelQuoteOrchestrator] Token usage:', {
          input: queryInfo.usage.input_tokens,
          output: queryInfo.usage.output_tokens,
          total: tokens
        });
      }

      return {
        step: 'Query Classification',
        status: 'completed',
        message: `Query understood as: ${queryInfo.category}${tokens ? ` (${tokens} tokens)` : ''}`,
        duration: Date.now() - startTime,
        data: queryInfo,
        tokens
      };
    } catch (error) {
      console.error('[TravelQuoteOrchestrator] Error in LLM query understanding:', error);
      return {
        step: 'Query Classification',
        status: 'failed',
        message: 'Failed to understand query with LLM',
        duration: Date.now() - startTime,
        data: error
      };
    }
  }

  /**
   * Fetch DMC settings (no validation yet)
   */
  private async performDMCSettingsFetch(
    dmcId: string
  ): Promise<ProcessingStep> {
    const startTime = Date.now();

    try {
      console.log('[TravelQuoteOrchestrator] Fetching DMC settings:', dmcId);

      // Fetch basic DMC settings (don't pass destination yet - we haven't classified the query!)
      const settings = await dmcSettingsService.getDMCSettings(dmcId);

      if (!settings) {
        return {
          step: 'DMC Settings Fetch',
          status: 'failed',
          message: 'DMC settings not found',
          duration: Date.now() - startTime,
          data: { error: 'DMC not found' }
        };
      }

      return {
        step: 'DMC Settings Fetch',
        status: 'completed',
        message: `DMC settings fetched (serves: ${settings.countryServing?.join(', ') || 'unknown'})`,
        duration: Date.now() - startTime,
        data: { settings }
      };
    } catch (error) {
      console.error('[TravelQuoteOrchestrator] Error fetching DMC settings:', error);
      return {
        step: 'DMC Settings Fetch',
        status: 'failed',
        message: 'Failed to fetch DMC settings',
        duration: Date.now() - startTime,
        data: error
      };
    }
  }

  /**
   * Perform policy validation (after query classification)
   */
  private async performPolicyValidation(
    dmcId: string,
    queryInfo: TravelQueryInfo,
    originalQuery: string,
    settings: DMCSettings,
    userSelectedModel?: string
  ): Promise<ProcessingStep> {
    const startTime = Date.now();

    try {
      console.log('[TravelQuoteOrchestrator] Validating query against DMC policies');

      // ✅ Pass original query and user model for LLM-based policy evaluation
      const validation = await dmcSettingsService.validateQueryAgainstSettings(
        dmcId,
        queryInfo,
        originalQuery,
        userSelectedModel
      );

      // ✅ Status is always 'completed' if validation ran successfully
      // The allowed/blocked decision is in data.allowed
      const tokens = validation.usage?.total_tokens || 0;
      return {
        step: 'Policy Validation',
        status: 'completed',
        message: validation.message || (validation.allowed ? 'Query allowed by policy' : 'Query blocked by policy'),
        duration: Date.now() - startTime,
        data: validation,
        tokens
      };
    } catch (error) {
      console.error('[TravelQuoteOrchestrator] Error in policy validation:', error);
      return {
        step: 'Policy Validation',
        status: 'failed',
        message: 'Failed to validate policy',
        duration: Date.now() - startTime,
        data: error
      };
    }
  }

  /**
   * Perform itinerary generation
   */
  private async performItineraryGeneration(
    queryInfo: TravelQueryInfo,
    dmcId: string,
    dmcSettings: DMCSettings, // ✅ Pass DMC settings (includes travel_theme)
    options?: TravelQuoteRequest['options'],
    userSelectedModel?: string
  ): Promise<ProcessingStep> {
    const startTime = Date.now();

    try {
      console.log('[TravelQuoteOrchestrator] Generating itinerary for:', queryInfo.category);

      const itineraryOptions = {
        includeExactPackageNames: options?.includeExactPackageNames !== false,
        includeHotelRoomNames: options?.includeHotelRoomNames !== false,
        followUserPreferences: true,
        customizable: true
      };

      const itinerary = await itineraryGenerationService.generateItinerary(
        queryInfo,
        dmcId,
        dmcSettings, // ✅ Pass DMC settings
        itineraryOptions,
        userSelectedModel // ✅ Pass user's model selection
      );

      const tokens = itinerary.usage?.total_tokens || 0;
      return {
        step: 'Itinerary Generation',
        status: 'completed',
        message: `Generated ${itinerary.totalDays}-day itinerary for ${itinerary.destination}`,
        duration: Date.now() - startTime,
        data: itinerary,
        tokens
      };
    } catch (error) {
      console.error('[TravelQuoteOrchestrator] Error in itinerary generation:', error);
      return {
        step: 'Itinerary Generation',
        status: 'failed',
        message: 'Failed to generate itinerary',
        duration: Date.now() - startTime,
        data: error
      };
    }
  }

  /**
   * Perform service rate fetching
   */
  private async performServiceRateFetching(
    queryInfo: TravelQueryInfo,
    dmcId: string,
    settings: DMCSettings
  ): Promise<ProcessingStep> {
    const startTime = Date.now();

    try {
      console.log('[TravelQuoteOrchestrator] Fetching service rates for:', queryInfo.services);

      const rateQuote = await serviceRateService.fetchRates(queryInfo, dmcId, settings);

      return {
        step: 'Service Rate Fetching',
        status: 'completed',
        message: `Fetched rates for ${rateQuote.services.length} services`,
        duration: Date.now() - startTime,
        data: rateQuote
      };
    } catch (error) {
      console.error('[TravelQuoteOrchestrator] Error in service rate fetching:', error);
      return {
        step: 'Service Rate Fetching',
        status: 'failed',
        message: 'Failed to fetch service rates',
        duration: Date.now() - startTime,
        data: error
      };
    }
  }

  /**
   * Determine if itinerary should be generated
   */
  private shouldGenerateItinerary(
    queryInfo: TravelQueryInfo,
    options?: TravelQuoteRequest['options']
  ): boolean {
    if (options?.skipItineraryGeneration) {
      return false;
    }

    // Always generate itinerary for complete quotes
    if (queryInfo.category === QueryCategory.COMPLETE_QUOTE) {
      return true;
    }

    // Generate itinerary if specifically requested
    if (queryInfo.isDetailedItinerary) {
      return true;
    }

    // ❌ REMOVED: DO NOT generate itinerary just because duration > 1 day
    // A hotel rate query for 4 nights should NOT get an itinerary!
    // Only COMPLETE_QUOTE or explicit itinerary requests should trigger generation.

    return false;
  }

  /**
   * Generate recommendations based on the complete response
   */
  private generateRecommendations(response: TravelQuoteResponse): string[] {
    const recommendations: string[] = [];

    // Itinerary recommendations
    if (response.itinerary) {
      recommendations.push(`Your ${response.itinerary.totalDays}-day ${response.itinerary.destination} itinerary is ready for review`);

      if (response.itinerary.estimatedBudget) {
        recommendations.push(`Estimated budget: ${response.itinerary.estimatedBudget.currency} ${response.itinerary.estimatedBudget.min} - ${response.itinerary.estimatedBudget.max}`);
      }
    }

    // Rate recommendations
    if (response.rateQuote) {
      const availableServices = response.rateQuote.services.filter(s => s.available);

      if (availableServices.length > 0) {
        recommendations.push(`${availableServices.length} service(s) available with rates`);

        if (response.rateQuote.recommendations && response.rateQuote.recommendations.length > 0) {
          recommendations.push(...response.rateQuote.recommendations);
        }
      }
    }

    // Policy-based recommendations
    if (response.policyValidation?.allowed && response.dmcSettings?.allow_individual_service_rates) {
      recommendations.push('Individual service rates are available - you can customize your package');
    }

    // Warning-based recommendations
    if (response.warnings && response.warnings.length > 0) {
      recommendations.push('Some features may not be available - please review warnings');
    }

    return recommendations;
  }

  /**
   * Get processing summary
   */
  public getProcessingSummary(response: TravelQuoteResponse): {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    totalDuration: number;
    successRate: string;
  } {
    const totalSteps = response.processingSteps.length;
    const completedSteps = response.processingSteps.filter(s => s.status === 'completed').length;
    const failedSteps = response.processingSteps.filter(s => s.status === 'failed').length;
    const totalDuration = response.processingSteps.reduce((sum, step) => sum + (step.duration || 0), 0);
    const successRate = totalSteps > 0 ? `${Math.round((completedSteps / totalSteps) * 100)}%` : '0%';

    return {
      totalSteps,
      completedSteps,
      failedSteps,
      totalDuration,
      successRate
    };
  }
}

// Export singleton instance
export const travelQuoteOrchestratorService = new TravelQuoteOrchestratorService();