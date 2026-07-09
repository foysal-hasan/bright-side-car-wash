export default () => ({
  app: {
    name: process.env.APP_NAME,
    key: process.env.APP_KEY,
    url: process.env.APP_URL,
    client_app_url: process.env.CLIENT_APP_URL,
    cross_origins: process.env.CROSS_ORIGINS,
    onboarding_refresh_url: process.env.ONBOARDING_REFRESH_URL,
    port: parseInt(process.env.PORT, 10) || 3000,
    environment: process.env.NODE_ENV || 'development',
  },

  fileSystems: {
    public: {},
    s3: {
      driver: 's3',
      key: process.env.AWS_ACCESS_KEY_ID,
      secret: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_DEFAULT_REGION,
      bucket: process.env.AWS_BUCKET,
      url: process.env.AWS_URL,
      endpoint: process.env.AWS_ENDPOINT,
    },
    gcs: {
      driver: 'gcs',
      projectId: process.env.GCP_PROJECT_ID,
      keyFile: process.env.GCP_KEY_FILE,
      apiEndpoint: process.env.GCP_API_ENDPOINT,
      bucket: process.env.GCP_BUCKET,
    },
  },

  database: {
    url: String(process.env.DATABASE_URL),
  },

  redis: {
    host: process.env.REDIS_HOST,
    password: process.env.REDIS_PASSWORD,
    port: process.env.REDIS_PORT,
  },

  security: {
    salt: 10,
  },

  jwt: {
    access_token_secret: process.env.JWT_ACCESS_TOKEN_SECRET,
    refresh_token_secret: process.env.JWT_REFRESH_TOKEN_SECRET,
    access_token_expiry: process.env.JWT_ACCESS_TOKEN_EXPIRY,
    refresh_token_expiry: process.env.JWT_REFRESH_TOKEN_EXPIRY,
  },

  mail: {
    provider: process.env.MAIL_PROVIDER || 'brevo',
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: process.env.MAIL_PORT || 587,
    user: process.env.MAIL_USERNAME,
    password: process.env.MAIL_PASSWORD,
    from: process.env.MAIL_FROM_ADDRESS,
  },

  auth: {
    google: {
      app_id: process.env.GOOGLE_APP_ID,
      app_secret: process.env.GOOGLE_APP_SECRET,
      callback: process.env.GOOGLE_CALLBACK_URL,
    },
  },

  payment: {
    stripe: {
      secret_key: process.env.STRIPE_SECRET_KEY,
      webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    paypal: {
      client_id: process.env.PAYPAL_CLIENT_ID,
      secret: process.env.PAYPAL_SECRET,
      api: process.env.PAYPAL_API,
    },
  },

  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY,
  },

  square: {
    accessToken: process.env.SQUARE_ACCESS_TOKEN,
    environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
    limit: parseInt(process.env.SQUARE_LIMIT, 10) || 100, // Default limit for Square API requests
  },

  /**
   * Storage directory
   */
  storageUrl: {
    rootUrl: './public/storage',
    rootUrlPublic: '/public/storage',
    // storage directory
    package: '/package/',
    destination: '/destination',
    blog: '/blog',
    avatar: '/avatar',
    websiteInfo: '/website-info',
    store: '/store',
    receipt: '/receipt',
    review: '/review',
    // chat
    attachment: '/attachment',
    portfolio: '/portfolio',

    // stage icon
    stage: '/stage/',

    // lead attachments
    lead: '/lead/',

    // email attachments
    emailAttachments: '/email-attachments/',

    // template images
    templateAttachments: '/template-attachments/',

    // gallery images
    gallery: '/gallery/',

    // testimonial images
    testimonialAvatars: '/testimonial-avatars/',

    // news and events images
    newsAndEvents: '/news-and-events/',

    // dynamic section media uploads
    sectionMedia: '/section-media/',
  },

  defaultUser: {
    system: {
      username: process.env.SYSTEM_USERNAME,
      email: process.env.SYSTEM_EMAIL,
      password: process.env.SYSTEM_PASSWORD,
    },
  },

  campaign: {
    brevo: {
      apiKey: process.env.BREVO_API_KEY,
      senderName: process.env.BREVO_SENDER_NAME,
      senderEmail: process.env.BREVO_SENDER_EMAIL,
    },
  }
});
