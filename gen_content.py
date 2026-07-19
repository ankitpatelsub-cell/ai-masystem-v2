#!/usr/bin/env python3
# gen_content.py — Claude writes SEO/service copy + a blog post for the MASystem site.
# Outputs markdown files under /root/ai-masystem-v2/content/. Run on demand or via cron.
import os
import claude

OUT = "/root/ai-masystem-v2/content"
os.makedirs(OUT, exist_ok=True)

def write(name, text):
    with open(os.path.join(OUT, name), "w") as f:
        f.write(text)
    print("wrote", name)

def main():
    # Service descriptions
    svcs = claude.ask(
        "For MA System / AI MASystem (Japan<->India offshore AI dev): write 4 short SEO service blurbs "
        "(hospital reception AI, hotel concierge AI, car-rental AI, dental front-desk AI). Each: title + 2 sentences + 3 bullet benefits. Markdown.",
        system="You are a B2B SaaS copywriter.")
    if svcs: write("services.md", svcs)
    # Homepage hero + about
    about = claude.ask(
        "Write: (1) a homepage hero headline + subheadline (<=20 words total) for AI MASystem, "
        "(2) a 3-sentence About paragraph. Plain markdown, separate with '## About'.",
        system="You are a conversion copywriter.")
    if about: write("about.md", about)
    # Blog post
    blog = claude.ask(
        "Write an SEO blog post (~400 words) titled 'Why Indian Hospitals Are Automating Front Desks with AI Agents'. "
        "Include: problem, how AI reception agents help, MA System's Japan-India advantage, a CTA. Markdown with H2 sections.",
        system="You are an AI-industry content writer.")
    if blog: write("blog-hospital-ai.md", blog)
    print("Content generation done.")

if __name__ == "__main__":
    main()
