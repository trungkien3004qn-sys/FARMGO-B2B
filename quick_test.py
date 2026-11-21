import os
import sys
from browser_use import Agent, Browser, ChatGoogle

api_key = os.environ.get("GEMINI_API_KEY", "")
llm = ChatGoogle(model="gemini-3-flash-preview", api_key=api_key)
browser = Browser("chromium", headless=False, executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe")

task = "Go to http://localhost:5173/customer and tell me what the page title or main heading is."

agent = Agent(task=task, llm=llm, browser=browser)
result = agent.run_sync()
print("RESULT:", result.final_result())
