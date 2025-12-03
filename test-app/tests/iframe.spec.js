import { test, expect } from '@playwright/test';

test.describe('Iframe Communication (BroadcastChannel)', () => {
  test.beforeEach(async ({ page }) => {
    // Clear IndexedDB before each test
    await page.goto('/iframe.html');
    await page.evaluate(async () => {
      const dbs = await indexedDB.databases();
      for (const db of dbs) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
        }
      }
    });
    await page.reload();
  });

  test('Iframe B receives messages from Iframe A via BroadcastChannel', async ({ page }) => {
    await page.goto('/iframe.html');

    // Get iframe references
    const iframeA = page.frameLocator('[data-testid="iframe-a"]');
    const iframeB = page.frameLocator('[data-testid="iframe-b"]');

    // Verify initial state
    await expect(iframeA.getByTestId('iframe-a-value')).toHaveText('--');
    await expect(iframeB.getByTestId('iframe-b-value')).toHaveText('--');
    await expect(iframeB.getByTestId('iframe-b-count')).toHaveText('0');

    // Send message from Iframe A
    await iframeA.getByTestId('message-input').fill('Hello from A');
    await iframeA.getByTestId('send-btn').click();

    // Iframe A should show the value
    await expect(iframeA.getByTestId('iframe-a-value')).toContainText('Hello from A');

    // Iframe B should receive via BroadcastChannel
    await expect(iframeB.getByTestId('iframe-b-value')).toContainText('Hello from A');
    await expect(iframeB.getByTestId('iframe-b-count')).toHaveText('1');
  });

  test('Multiple messages are received in order', async ({ page }) => {
    await page.goto('/iframe.html');

    const iframeA = page.frameLocator('[data-testid="iframe-a"]');
    const iframeB = page.frameLocator('[data-testid="iframe-b"]');

    // Send first message
    await iframeA.getByTestId('message-input').fill('Message 1');
    await iframeA.getByTestId('send-btn').click();
    await expect(iframeB.getByTestId('iframe-b-count')).toHaveText('1');

    // Send second message
    await iframeA.getByTestId('message-input').fill('Message 2');
    await iframeA.getByTestId('send-btn').click();
    await expect(iframeB.getByTestId('iframe-b-count')).toHaveText('2');
    await expect(iframeB.getByTestId('iframe-b-value')).toContainText('Message 2');

    // Send third message
    await iframeA.getByTestId('message-input').fill('Message 3');
    await iframeA.getByTestId('send-btn').click();
    await expect(iframeB.getByTestId('iframe-b-count')).toHaveText('3');
    await expect(iframeB.getByTestId('iframe-b-value')).toContainText('Message 3');
  });

  test('Clear in Iframe A notifies Iframe B', async ({ page }) => {
    await page.goto('/iframe.html');

    const iframeA = page.frameLocator('[data-testid="iframe-a"]');
    const iframeB = page.frameLocator('[data-testid="iframe-b"]');

    // Send a message
    await iframeA.getByTestId('message-input').fill('Test message');
    await iframeA.getByTestId('send-btn').click();
    await expect(iframeB.getByTestId('iframe-b-value')).toContainText('Test message');

    // Clear from Iframe A
    await iframeA.getByTestId('clear-btn').click();

    // Both should show empty
    await expect(iframeA.getByTestId('iframe-a-value')).toHaveText('--');
    await expect(iframeB.getByTestId('iframe-b-value')).toHaveText('--');
  });

  test('Data persists in IndexedDB across iframe reload', async ({ page }) => {
    await page.goto('/iframe.html');

    const iframeA = page.frameLocator('[data-testid="iframe-a"]');
    const iframeB = page.frameLocator('[data-testid="iframe-b"]');

    // Send a message
    await iframeA.getByTestId('message-input').fill('Persistent message');
    await iframeA.getByTestId('send-btn').click();
    await expect(iframeB.getByTestId('iframe-b-value')).toContainText('Persistent message');

    // Reload the whole page
    await page.reload();

    // Get new iframe references after reload
    const iframeANew = page.frameLocator('[data-testid="iframe-a"]');
    const iframeBNew = page.frameLocator('[data-testid="iframe-b"]');

    // Data should persist from IndexedDB
    await expect(iframeANew.getByTestId('iframe-a-value')).toContainText('Persistent message');
    await expect(iframeBNew.getByTestId('iframe-b-value')).toContainText('Persistent message');
  });
});
