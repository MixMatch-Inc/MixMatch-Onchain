const bearerSecurity = [{ bearerAuth: [] }];

export const apiOpenApiPaths = {
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register a new MixMatch user',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/RegisterRequest' },
            examples: {
              planner: {
                value: {
                  email: 'planner@example.com',
                  password: 'mixmatch123',
                  role: 'PLANNER',
                },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'User registered',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthEnvelope' },
            },
          },
        },
        '409': {
          description: 'Email already exists',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StructuredErrorEnvelope' },
            },
          },
        },
      },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Authenticate with email and password',
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/LoginRequest' },
            examples: {
              login: {
                value: {
                  email: 'fan@example.com',
                  password: 'mixmatch123',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Authenticated user',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/AuthEnvelope' },
            },
          },
        },
        '401': {
          description: 'Invalid credentials',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StructuredErrorEnvelope' },
            },
          },
        },
      },
    },
  },
  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Return the authenticated user',
      security: bearerSecurity,
      responses: {
        '200': {
          description: 'Current user',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CurrentUserResponse' },
            },
          },
        },
        '401': {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/MessageResponse' },
            },
          },
        },
      },
    },
  },
  '/auth/onboarding': {
    patch: {
      tags: ['Auth'],
      summary: 'Update onboarding completion state',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateOnboardingRequest' },
            examples: {
              complete: {
                value: {
                  onboardingCompleted: true,
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Updated onboarding state',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CurrentUserResponse' },
            },
          },
        },
      },
    },
  },
  '/bookings/me': {
    get: {
      tags: ['Bookings'],
      summary: 'List bookings for the authenticated planner or DJ',
      security: bearerSecurity,
      parameters: [
        {
          name: 'status',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'],
          },
        },
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', minimum: 1, default: 1 },
        },
        {
          name: 'pageSize',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 50, default: 10 },
        },
      ],
      responses: {
        '200': {
          description: 'Paginated bookings',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/BookingPageResponse' },
            },
          },
        },
      },
    },
  },
  '/journeys/owner/me': {
    get: {
      tags: ['Journeys'],
      summary: 'List private and public journeys owned by the current user',
      security: bearerSecurity,
      responses: {
        '200': {
          description: 'Owner journeys',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/JourneyListResponse' },
            },
          },
        },
      },
    },
  },
  '/journeys/public/{userId}': {
    get: {
      tags: ['Journeys'],
      summary: 'List public journeys for a profile owner',
      security: bearerSecurity,
      parameters: [
        {
          name: 'userId',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        '200': {
          description: 'Public journeys',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/JourneyListResponse' },
            },
          },
        },
      },
    },
  },
  '/journeys/{id}': {
    get: {
      tags: ['Journeys'],
      summary: 'Return a single journey with reveal-aware fields',
      security: bearerSecurity,
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        '200': {
          description: 'Journey detail',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/JourneyResponse' },
            },
          },
        },
      },
    },
  },
  '/discover/feed': {
    get: {
      tags: ['Discovery'],
      summary: 'Return the viewer discovery feed',
      security: bearerSecurity,
      parameters: [
        {
          name: 'mode',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['standard', 'blind'],
            default: 'standard',
          },
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
        {
          name: 'cursor',
          in: 'query',
          schema: { type: 'string' },
        },
      ],
      responses: {
        '200': {
          description: 'Discovery feed page',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DiscoveryFeedResponse' },
            },
          },
        },
      },
    },
  },
  '/discover/djs': {
    get: {
      tags: ['Discovery'],
      summary: 'List DJ profiles with pagination',
      security: bearerSecurity,
      parameters: [
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        },
        {
          name: 'cursor',
          in: 'query',
          schema: { type: 'string' },
        },
        {
          name: 'direction',
          in: 'query',
          schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        },
      ],
      responses: {
        '200': {
          description: 'Paginated DJ profiles',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PaginatedDjProfilesResponse' },
            },
          },
        },
      },
    },
  },
  '/discover/djs/{id}': {
    get: {
      tags: ['Discovery'],
      summary: 'Return a single DJ profile',
      security: bearerSecurity,
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        '200': {
          description: 'DJ profile',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DjProfileResponse' },
            },
          },
        },
      },
    },
  },
  '/discover/impressions': {
    post: {
      tags: ['Discovery'],
      summary: 'Ingest discovery impression events',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ImpressionBatchRequest' },
            examples: {
              likeBatch: {
                value: {
                  events: [
                    {
                      targetProfileId: '6632af8d1f0b86e2e51d5102',
                      eventType: 'like',
                      clientEventId: 'evt_001',
                      occurredAt: '2026-04-25T10:00:00.000Z',
                      metadata: {
                        source: 'feed',
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'All events accepted',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ImpressionBatchResponse' },
            },
          },
        },
        '207': {
          description: 'Mixed accepted and rejected events',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ImpressionBatchResponse' },
            },
          },
        },
      },
    },
  },
  '/resonance': {
    get: {
      tags: ['Resonance'],
      summary: 'List active resonances for the authenticated user',
      security: bearerSecurity,
      responses: {
        '200': {
          description: 'Resonance list',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResonanceListResponse' },
            },
          },
        },
      },
    },
  },
  '/taste-signals': {
    get: {
      tags: ['Taste Signals'],
      summary: 'List the current user taste signals',
      security: bearerSecurity,
      responses: {
        '200': {
          description: 'Taste signals',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TasteSignalListResponse' },
            },
          },
        },
      },
    },
    post: {
      tags: ['Taste Signals'],
      summary: 'Create a taste signal',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/CreateTasteSignalRequest' },
            examples: {
              album: {
                value: {
                  category: 'ALBUM',
                  label: 'Homecoming',
                  providerRef: 'spotify:album:123',
                  narrative: 'Album that always resets my taste profile.',
                },
              },
            },
          },
        },
      },
      responses: {
        '201': {
          description: 'Created taste signal',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TasteSignalResponse' },
            },
          },
        },
      },
    },
  },
  '/taste-signals/reorder': {
    patch: {
      tags: ['Taste Signals'],
      summary: 'Reorder taste signals',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ReorderTasteSignalsRequest' },
          },
        },
      },
      responses: {
        '204': {
          description: 'Signals reordered',
        },
      },
    },
  },
  '/taste-signals/{id}': {
    patch: {
      tags: ['Taste Signals'],
      summary: 'Update a taste signal',
      security: bearerSecurity,
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/UpdateTasteSignalRequest' },
          },
        },
      },
      responses: {
        '200': {
          description: 'Updated taste signal',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/TasteSignalResponse' },
            },
          },
        },
      },
    },
    delete: {
      tags: ['Taste Signals'],
      summary: 'Delete a taste signal',
      security: bearerSecurity,
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        '204': {
          description: 'Taste signal deleted',
        },
      },
    },
  },
  '/payments/stellar/account/{publicKey}': {
    get: {
      tags: ['Wallet'],
      summary: 'Resolve a Stellar account through the wallet gateway',
      security: bearerSecurity,
      parameters: [
        {
          name: 'publicKey',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        '200': {
          description: 'Wallet account lookup',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StellarAccountResponse' },
            },
          },
        },
      },
    },
  },
  '/payments/stellar/payment': {
    post: {
      tags: ['Wallet'],
      summary: 'Create a Stellar payment through the wallet gateway',
      security: bearerSecurity,
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/StellarPaymentRequest' },
            examples: {
              payment: {
                value: {
                  destination: 'GABC1234567890',
                  amount: '25.0000000',
                  memo: 'Deposit for booking #42',
                },
              },
            },
          },
        },
      },
      responses: {
        '200': {
          description: 'Payment created',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StellarPaymentResponse' },
            },
          },
        },
      },
    },
  },
} as const;
