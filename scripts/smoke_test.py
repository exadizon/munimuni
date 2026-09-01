import os

from playwright.sync_api import sync_playwright


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.on('console', lambda message: print(f'console: {message.type}: {message.text}'))
    page.on('pageerror', lambda error: print(f'pageerror: {error}'))
    page.goto(os.environ.get('MUNIMUNI_SMOKE_URL', 'http://localhost:4173'))
    page.wait_for_load_state('networkidle')
    print(f'body length: {len(page.locator("body").inner_text())}')

    editor = page.locator('textarea.editor')
    editor.fill('A small test of keeping thoughts close.')
    page.wait_for_timeout(900)
    assert page.get_by_text('Saved locally').is_visible()
    assert page.get_by_text('7 words').is_visible()

    page.locator('.date-nav').nth(1).click()
    assert page.get_by_text('A blank page').is_visible()
    editor = page.locator('textarea.editor')
    editor.fill('A second page, still offline.')
    page.wait_for_timeout(900)

    page.get_by_role('button', name='Open settings').click()
    page.get_by_role('button', name='Dark').click()
    page.get_by_role('button', name='A clear modern').click()
    assert page.locator('html[data-appearance="dark"]').count() == 1
    assert page.locator('.paper-wrap').evaluate("element => getComputedStyle(element).borderWidth") == '0px'
    assert page.locator('textarea.editor').evaluate("element => getComputedStyle(element).outlineStyle") == 'none'
    assert page.get_by_role('button', name='A clear modern').evaluate("element => getComputedStyle(element).color") != 'rgb(0, 0, 0)'
    page.reload()
    page.wait_for_load_state('networkidle')
    page.locator('.date-nav').nth(1).click()
    assert page.locator('textarea.editor').input_value() == 'A second page, still offline.'
    assert page.locator('html[data-appearance="dark"]').count() == 1
    browser.close()

print('Munimuni smoke test passed')
