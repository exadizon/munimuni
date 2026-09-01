from playwright.sync_api import sync_playwright


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    page.on("console", lambda message: print("console:", message.type, message.text))
    page.on("requestfailed", lambda request: print("request failed:", request.url, request.failure))
    page.on("request", lambda request: print("request:", request.method, request.url) if "/api" in request.url else None)
    page.on("response", lambda response: print("response:", response.status, response.url) if "/api/auth" in response.url else None)
    page.goto("http://127.0.0.1:34567", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(5000)
    page.screenshot(path="browser-smoke-mobile.png", full_page=True)
    print("url:", page.url)
    print("title:", page.title())
    print("headings:", page.locator("h1, h2").all_text_contents())
    print("buttons:", page.locator("button").all_text_contents())
    print("inputs:", page.locator("input").count())
    assert page.locator("input[type=email]").count() == 1
    assert page.locator("input[type=password]").count() == 1
    assert page.get_by_role("button", name="Sign in").count() == 1
    password = page.locator("input[autocomplete=current-password]")
    page.get_by_role("button", name="Show password").click()
    assert password.get_attribute("type") == "text"
    page.get_by_role("button", name="Hide password").click()
    assert password.get_attribute("type") == "password"
    assert (page.request.get("http://127.0.0.1:34567/api/profile")).status == 401
    page.get_by_role("button", name="Forgot password?").click()
    assert page.get_by_role("button", name="Email reset link").count() == 1
    assert page.locator("input[type=password]").count() == 0
    page.get_by_role("button", name="Back to sign in").click()
    page.get_by_role("button", name="New here? Create an account").click()
    assert page.get_by_role("button", name="Create account").count() == 1
    assert page.locator("input[autocomplete=name]").count() == 1
    assert (page.request.get("http://127.0.0.1:34567/manifest.webmanifest")).status == 200
    assert (page.request.get("http://127.0.0.1:34567/sw.js")).status == 200
    reset_page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    reset_page.goto("http://127.0.0.1:34567/auth/reset-password?token=smoke-test-token", wait_until="domcontentloaded")
    reset_page.get_by_role("button", name="Update password").wait_for(state="visible")
    assert reset_page.get_by_role("button", name="Update password").count() == 1
    assert reset_page.locator("input[type=password]").count() == 2
    browser.close()
