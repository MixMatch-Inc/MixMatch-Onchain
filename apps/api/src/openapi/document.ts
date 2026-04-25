import { apiOpenApiPaths } from './registry';

export const openApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'MixMatch API',
    version: 'v1',
    description: 'Generated contract for MixMatch REST endpoints.',
  },
  servers: [
    {
      url: 'http://localhost:3001',
      description: 'Local API server',
    },
  ],
  tags: [
    { name: 'Auth' },
    { name: 'Bookings' },
    { name: 'Journeys' },
    { name: 'Discovery' },
    { name: 'Resonance' },
    { name: 'Taste Signals' },
    { name: 'Wallet' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      User: {
        type: 'object',
        required: ['id', 'name', 'email', 'role', 'onboardingCompleted'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          role: {
            type: 'string',
            enum: ['DJ', 'PLANNER', 'MUSIC_LOVER', 'ADMIN'],
          },
          onboardingCompleted: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      AuthEnvelope: {
        type: 'object',
        required: ['success', 'data'],
        properties: {
          success: { type: 'boolean', const: true },
          data: {
            type: 'object',
            required: ['token', 'user'],
            properties: {
              token: { type: 'string' },
              user: { $ref: '#/components/schemas/User' },
            },
          },
        },
      },
      CurrentUserResponse: {
        type: 'object',
        required: ['user'],
        properties: {
          user: { $ref: '#/components/schemas/User' },
        },
      },
      RegisterRequest: {
        type: 'object',
        required: ['email', 'password', 'role'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          role: {
            type: 'string',
            enum: ['DJ', 'PLANNER', 'MUSIC_LOVER'],
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 },
        },
      },
      UpdateOnboardingRequest: {
        type: 'object',
        required: ['onboardingCompleted'],
        properties: {
          onboardingCompleted: { type: 'boolean' },
        },
      },
      MessageResponse: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string' },
        },
      },
      StructuredErrorEnvelope: {
        type: 'object',
        required: ['success', 'error'],
        properties: {
          success: { type: 'boolean', const: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              domain: { type: 'string' },
              message: { type: 'string' },
              requestId: { type: 'string' },
            },
          },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          planner: { type: 'string' },
          dj: { type: 'string' },
          eventType: { type: 'string' },
          eventDate: { type: 'string', format: 'date-time' },
          budget: { type: 'number' },
          notes: { type: 'string' },
          status: { type: 'string' },
          paymentStatus: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      BookingPageResponse: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/Booking' },
          },
          page: { type: 'integer' },
          pageSize: { type: 'integer' },
          total: { type: 'integer' },
        },
      },
      Journey: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          genres: {
            type: 'array',
            items: { type: 'string' },
          },
          vibeTags: {
            type: 'array',
            items: { type: 'string' },
          },
          visibility: { type: 'string' },
          privateNotes: { type: 'string' },
          revealedTo: {
            type: 'array',
            items: { type: 'string' },
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      JourneyResponse: {
        type: 'object',
        properties: {
          journey: { $ref: '#/components/schemas/Journey' },
        },
      },
      JourneyListResponse: {
        type: 'object',
        properties: {
          journeys: {
            type: 'array',
            items: { $ref: '#/components/schemas/Journey' },
          },
        },
      },
      DjProfile: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          stageName: { type: 'string' },
          bio: { type: 'string' },
          genres: {
            type: 'array',
            items: { type: 'string' },
          },
          vibeTags: {
            type: 'array',
            items: { type: 'string' },
          },
          pricing: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
            },
          },
          location: {
            oneOf: [
              { type: 'string' },
              {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  coordinates: {
                    type: 'array',
                    items: { type: 'number' },
                  },
                },
              },
            ],
          },
          availabilityStatus: { type: 'string' },
          socialLinks: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      DjProfileResponse: {
        type: 'object',
        properties: {
          profile: { $ref: '#/components/schemas/DjProfile' },
        },
      },
      PaginatedDjProfilesResponse: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/DjProfile' },
          },
          pagination: {
            type: 'object',
            properties: {
              nextCursor: { type: 'string' },
              previousCursor: { type: 'string' },
              hasNextPage: { type: 'boolean' },
              hasPreviousPage: { type: 'boolean' },
            },
          },
        },
      },
      DiscoveryFeedItem: {
        type: 'object',
        properties: {
          profileId: { type: 'string' },
          stageName: { type: 'string' },
          bio: { type: 'string' },
          genres: {
            type: 'array',
            items: { type: 'string' },
          },
          vibeTags: {
            type: 'array',
            items: { type: 'string' },
          },
          pricing: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
            },
          },
          location: { type: 'string' },
          availabilityStatus: { type: 'string' },
          revealPhase: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      DiscoveryFeedResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: '#/components/schemas/DiscoveryFeedItem' },
          },
          hasNextPage: { type: 'boolean' },
          nextCursor: { type: 'string' },
        },
      },
      ImpressionEvent: {
        type: 'object',
        required: ['targetProfileId', 'eventType', 'clientEventId', 'occurredAt'],
        properties: {
          targetProfileId: { type: 'string' },
          eventType: {
            type: 'string',
            enum: [
              'slot_start',
              'slot_complete',
              'slot_skip',
              'reaction',
              'like',
              'hide',
              'journey_exit',
            ],
          },
          clientEventId: { type: 'string' },
          occurredAt: { type: 'string', format: 'date-time' },
          metadata: {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
      ImpressionBatchRequest: {
        type: 'object',
        required: ['events'],
        properties: {
          events: {
            type: 'array',
            minItems: 1,
            maxItems: 100,
            items: { $ref: '#/components/schemas/ImpressionEvent' },
          },
        },
      },
      ImpressionBatchResponse: {
        type: 'object',
        properties: {
          results: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                clientEventId: { type: 'string' },
                status: {
                  type: 'string',
                  enum: ['accepted', 'rejected'],
                },
                reason: { type: 'string' },
              },
            },
          },
        },
      },
      Resonance: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          counterpartUserId: { type: 'string' },
          status: { type: 'string', enum: ['active', 'expired', 'blocked'] },
          revealInitialized: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      ResonanceListResponse: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/Resonance' },
          },
        },
      },
      TasteSignal: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          category: {
            type: 'string',
            enum: ['ALBUM', 'CONCERT_MEMORY', 'ARTIST', 'GENRE', 'VIBE'],
          },
          label: { type: 'string' },
          providerRef: { type: 'string' },
          narrative: { type: 'string' },
          order: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      CreateTasteSignalRequest: {
        type: 'object',
        required: ['category', 'label'],
        properties: {
          category: {
            type: 'string',
            enum: ['ALBUM', 'CONCERT_MEMORY', 'ARTIST', 'GENRE', 'VIBE'],
          },
          label: { type: 'string' },
          providerRef: { type: 'string' },
          narrative: { type: 'string' },
          order: { type: 'integer' },
        },
      },
      UpdateTasteSignalRequest: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          providerRef: { type: 'string' },
          narrative: { type: 'string' },
          order: { type: 'integer' },
        },
      },
      ReorderTasteSignalsRequest: {
        type: 'object',
        required: ['signals'],
        properties: {
          signals: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'order'],
              properties: {
                id: { type: 'string' },
                order: { type: 'integer' },
              },
            },
          },
        },
      },
      TasteSignalResponse: {
        type: 'object',
        properties: {
          signal: { $ref: '#/components/schemas/TasteSignal' },
        },
      },
      TasteSignalListResponse: {
        type: 'object',
        properties: {
          signals: {
            type: 'array',
            items: { $ref: '#/components/schemas/TasteSignal' },
          },
        },
      },
      StellarAccountResponse: {
        type: 'object',
        properties: {
          exists: { type: 'boolean' },
          publicKey: { type: 'string' },
          balances: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                asset: { type: 'string' },
                balance: { type: 'string' },
              },
            },
          },
        },
      },
      StellarPaymentRequest: {
        type: 'object',
        required: ['destination', 'amount'],
        properties: {
          destination: { type: 'string' },
          amount: { type: 'string' },
          memo: { type: 'string' },
        },
      },
      StellarPaymentResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          hash: { type: 'string' },
          message: { type: 'string' },
        },
      },
    },
  },
  paths: apiOpenApiPaths,
} as const;
