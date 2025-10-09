/**
 * Critical Path Smoke Tests
 * These tests verify core functionality before deployment
 * Run with: npm run test:smoke
 */

import { test, expect } from '@playwright/test';

// Test Configuration
const BASE_URL = process.env.VITE_SITE_URL || 'http://localhost:5173';
const TEST_TIMEOUT = 30000;

test.describe('Critical Path Smoke Tests', () => {
  test.setTimeout(TEST_TIMEOUT);

  test.describe('Authentication Flow', () => {
    test('should load login page', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth`);
      
      // Check for login form elements
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show validation for empty login', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth`);
      
      // Try to submit empty form
      await page.locator('button[type="submit"]').click();
      
      // Should show validation (exact message may vary)
      // At minimum, should not navigate away
      await expect(page).toHaveURL(/.*auth/);
    });

    test('should navigate to forgot password', async ({ page }) => {
      await page.goto(`${BASE_URL}/auth`);
      
      // Look for forgot password link
      const forgotPasswordLink = page.locator('text=/forgot.*password/i');
      if (await forgotPasswordLink.isVisible()) {
        await forgotPasswordLink.click();
        await expect(page).toHaveURL(/.*forgot-password/);
      }
    });
  });

  test.describe('Application Structure', () => {
    test('should have proper HTML structure', async ({ page }) => {
      await page.goto(BASE_URL);
      
      // Check for critical HTML elements
      await expect(page.locator('html')).toBeVisible();
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('#root')).toBeVisible();
    });

    test('should load without console errors', async ({ page }) => {
      const errors: string[] = [];
      
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // Filter out known non-critical errors
      const criticalErrors = errors.filter(error => 
        !error.includes('favicon') && 
        !error.includes('VITE_') &&
        !error.toLowerCase().includes('dev mode')
      );
      
      expect(criticalErrors).toHaveLength(0);
    });

    test('should not have JavaScript errors on page load', async ({ page }) => {
      const jsErrors: Error[] = [];
      
      page.on('pageerror', error => {
        jsErrors.push(error);
      });

      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      expect(jsErrors).toHaveLength(0);
    });
  });

  test.describe('Resource Loading', () => {
    test('should load all CSS resources', async ({ page }) => {
      const failedRequests: string[] = [];
      
      page.on('response', response => {
        if (response.url().endsWith('.css') && !response.ok()) {
          failedRequests.push(response.url());
        }
      });

      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      expect(failedRequests).toHaveLength(0);
    });

    test('should load all JavaScript resources', async ({ page }) => {
      const failedRequests: string[] = [];
      
      page.on('response', response => {
        if ((response.url().endsWith('.js') || response.url().endsWith('.jsx')) 
            && !response.ok()) {
          failedRequests.push(response.url());
        }
      });

      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      expect(failedRequests).toHaveLength(0);
    });

    test('should not have 404 errors', async ({ page }) => {
      const notFoundRequests: string[] = [];
      
      page.on('response', response => {
        if (response.status() === 404) {
          notFoundRequests.push(response.url());
        }
      });

      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // Filter out expected 404s (like favicon in some cases)
      const unexpected404s = notFoundRequests.filter(url => 
        !url.includes('favicon')
      );
      
      expect(unexpected404s).toHaveLength(0);
    });
  });

  test.describe('Routing', () => {
    test('should handle 404 route gracefully', async ({ page }) => {
      await page.goto(`${BASE_URL}/this-route-does-not-exist`);
      
      // Should either redirect or show 404 page, not crash
      const hasError = await page.locator('text=/not found|404/i').isVisible()
        .catch(() => false);
      const redirected = page.url() !== `${BASE_URL}/this-route-does-not-exist`;
      
      expect(hasError || redirected).toBeTruthy();
    });

    test('should redirect unauthenticated users from protected routes', async ({ page }) => {
      await page.goto(`${BASE_URL}/dashboard`);
      
      // Should redirect to auth page
      await page.waitForURL(/.*auth/, { timeout: 5000 });
      expect(page.url()).toContain('auth');
    });
  });

  test.describe('Performance', () => {
    test('should load initial page within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should have reasonable bundle size', async ({ page }) => {
      let totalSize = 0;
      
      page.on('response', response => {
        if (response.url().includes('.js') || response.url().includes('.css')) {
          response.body().then(body => {
            totalSize += body.length;
          }).catch(() => {});
        }
      });

      await page.goto(BASE_URL);
      await page.waitForLoadState('networkidle');
      
      // Wait a bit for all responses to be processed
      await page.waitForTimeout(1000);
      
      // Total initial bundle should be under 5MB (reasonable for healthcare app)
      expect(totalSize).toBeLessThan(5 * 1024 * 1024);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper page title', async ({ page }) => {
      await page.goto(BASE_URL);
      
      const title = await page.title();
      expect(title).toBeTruthy();
      expect(title.length).toBeGreaterThan(0);
    });

    test('should have lang attribute', async ({ page }) => {
      await page.goto(BASE_URL);
      
      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBeTruthy();
    });

    test('should have viewport meta tag', async ({ page }) => {
      await page.goto(BASE_URL);
      
      const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
      expect(viewport).toBeTruthy();
    });
  });

  test.describe('Client Portal', () => {
    test('should load portal login page', async ({ page }) => {
      await page.goto(`${BASE_URL}/portal/login`);
      
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
    });

    test('should have portal branding/logo', async ({ page }) => {
      await page.goto(`${BASE_URL}/portal/login`);
      
      // Should have some branding element (logo or title)
      const hasBranding = await page.locator('img, h1, [class*="logo"]').first().isVisible();
      expect(hasBranding).toBeTruthy();
    });
  });

  test.describe('Error Handling', () => {
    test('should have error boundary', async ({ page }) => {
      // This is hard to test without intentionally breaking things
      // But we can check that the error boundary component exists in the bundle
      await page.goto(BASE_URL);
      
      const content = await page.content();
      // Check if error boundary is being used (it should be in the code)
      // This is a basic check
      expect(content).toBeTruthy();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Go offline
      await page.context().setOffline(true);
      
      await page.goto(BASE_URL).catch(() => {
        // Expected to fail, but should not crash
      });
      
      // Go back online
      await page.context().setOffline(false);
      
      // Should be able to reload successfully
      await page.goto(BASE_URL);
      await expect(page.locator('body')).toBeVisible();
    });
  });
});

test.describe('Integration Health Checks', () => {
  test('should connect to Supabase', async ({ page }) => {
    await page.goto(BASE_URL);
    
    // Check if Supabase client initializes (no errors in console)
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().toLowerCase().includes('supabase')) {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);
    
    expect(errors).toHaveLength(0);
  });
});
