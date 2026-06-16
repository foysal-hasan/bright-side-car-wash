import { Injectable } from '@nestjs/common';
import { SojebStorage } from './common/lib/Disk/SojebStorage';
import appConfig from './config/app.config';

@Injectable()
export class AppService {
  getHello(): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>API Server Running</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0f172a;
            color: #e5e7eb;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .card {
            background: #020617;
            border-radius: 12px;
            padding: 32px 40px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.4);
            max-width: 420px;
            text-align: center;
          }
          h1 {
            margin: 0 0 12px;
            font-size: 22px;
            color: #38bdf8;
          }
          p {
            margin: 0;
            font-size: 14px;
            opacity: 0.85;
          }
          code {
            display: block;
            margin-top: 16px;
            background: #020617;
            padding: 10px;
            border-radius: 6px;
            color: #a5f3fc;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>API is Running</h1>
          <p>Your backend service is up and responding.</p>
          <a href="${appConfig().app.url}/api" target="_blank"><code>Base URL: ${appConfig().app.url}/api</code></a>
          <a href="${appConfig().app.url}/api/docs" target="_blank"><code>Docs: ${appConfig().app.url}/api/docs</code></a>
        </div>
      </body>
    </html>
  `;
  }

  async test(image: Express.Multer.File) {
    try {
      const fileName = image.originalname;
      const fileType = image.mimetype;
      const fileSize = image.size;
      const fileBuffer = image.buffer;

      const result = await SojebStorage.put(fileName, fileBuffer);

      return {
        success: true,
        message: 'Image uploaded successfully',
        data: result,
        url: SojebStorage.url('tony1.jpg'),
      };
    } catch (error) {
      throw new Error(`Failed to upload image: ${error}`);
    }
  }

  stripeOnboardingRefresh() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Session Expired</title>

  <style>
    body {
      margin: 0;
      background: #0b0f14;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }

    .card {
      background: #131a22;
      border-radius: 20px;
      padding: 28px;
      width: 90%;
      max-width: 380px;
      text-align: center;
      box-shadow: 0 30px 80px rgba(0,0,0,0.6);
    }

    .icon {
      font-size: 46px;
      margin-bottom: 16px;
    }

    h2 {
      margin: 0 0 8px;
      font-size: 20px;
    }

    p {
      color: #8b98a9;
      font-size: 14px;
      margin-bottom: 22px;
    }

    button {
      width: 100%;
      padding: 14px;
      border-radius: 14px;
      border: none;
      background: linear-gradient(135deg, #4da3ff, #2f7de1);
      color: white;
      font-size: 15px;
      cursor: pointer;
    }
  </style>
</head>
<body>

  <div class="card">
    <div class="icon">⏳</div>
    <h2>Session Expired</h2>
    <p>Your Stripe onboarding session expired. Please try again.</p>

    <button onclick="retry()">Restart Onboarding</button>
  </div>

  <script>
    function retry() {
      // Call backend to create a new Stripe onboarding link
      window.location.href = "/api/stripe/onboarding";
    }
  </script>

</body>
</html>
`
  }

  stripeOnboardingReturn() {
    return `
    <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Onboarding Complete</title>

  <style>
    body {
      margin: 0;
      background: #0b0f14;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
    }

    .card {
      background: #131a22;
      border-radius: 20px;
      padding: 28px;
      width: 90%;
      max-width: 380px;
      text-align: center;
      box-shadow: 0 30px 80px rgba(0,0,0,0.6);
    }

    .icon {
      font-size: 46px;
      margin-bottom: 16px;
    }

    h2 {
      margin: 0 0 8px;
      font-size: 20px;
    }

    p {
      color: #8b98a9;
      font-size: 14px;
      margin-bottom: 22px;
    }

    button {
      width: 100%;
      padding: 14px;
      border-radius: 14px;
      border: none;
      background: linear-gradient(135deg, #4da3ff, #2f7de1);
      color: white;
      font-size: 15px;
      cursor: pointer;
    }
  </style>
</head>
<body>

  <div class="card">
    <div class="icon">✅</div>
    <h2>Onboarding Complete</h2>
    <p>Your Stripe account has been successfully connected.</p>

    <button onclick="goBack()">Continue</button>
  </div>

  <script>
    function goBack() {
      // WebView safe redirect
      window.location.href = "yourapp://stripe/success";
    }
  </script>

</body>
</html>

    `
  }
}
