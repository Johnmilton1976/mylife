#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Add a genuine FAQ section + FAQPage JSON-LD to the 6 landing pages that
lack one (rich-dad-poor-dad-game already has it). Mirrors the markup/schema
pattern on rich-dad-poor-dad-game so Google sees matching visible+structured FAQ.

Idempotent: skips pages that already contain a 'Frequently asked' heading.
"""
import json, os

# (dir, list of (question, answer))  -- questions/answers also feed the schema.
FAQS = {
    "text-based-life-simulator": [
        ("Is MY LIFE a text-based life simulator?",
         "Yes. MY LIFE tells a whole life — birth, school, jobs, money, health and the end — through words, numbers and a simple city map rather than 3D graphics. The decisions are the game; the text is what makes them land."),
        ("Do I have to read a lot to play?",
         "No. Each turn is a short prompt with a few choices you tap or click. The writing is there to give the numbers a story, not to make you read a book."),
        ("Can I play it on a phone?",
         "Yes — it runs in any mobile browser with no install. The city map is easier to read on a laptop or tablet, but the game itself works on a phone."),
    ],
    "life-simulator-browser-game": [
        ("Do I have to download or install anything?",
         "No. MY LIFE runs entirely inside a browser tab. There is no app, no app-store login, no install and no permission prompt — open the page and play."),
        ("Is the browser life simulator free?",
         "Yes. No account, no purchase and no ads inside the game. Your save stays in your own browser and is never uploaded."),
        ("Does it work on a Chromebook or mobile?",
         "Yes. Any modern browser works, so it runs on Windows, macOS, Linux, ChromeOS, iOS and Android alike."),
    ],
    "bitlife-alternative": [
        ("Is MY LIFE a BitLife alternative?",
         "If you want a game that plays a whole life from birth to death, yes. MY LIFE covers the same arc — school, jobs, money, relationships, health — but it is free, browser-based and has no ads or microtransactions."),
        ("How is it different from BitLife?",
         "BitLife is a phone app with in-app purchases. MY LIFE runs in a browser with no install and no paywalls, and it leans into the money lesson (assets vs liabilities) rather than randomness."),
        ("Can I play it on a laptop instead of a phone?",
         "Yes. Because it is a browser game, a laptop or tablet is the most comfortable place to play — no phone required."),
    ],
    "escape-the-rat-race-game": [
        ("What does 'escape the rat race' mean in the game?",
         "It is the win condition: build enough monthly passive income from assets that it covers your living expenses, so you no longer have to work for a paycheck. Until then you are in the rat race."),
        ("Is the game based on Rich Dad Poor Dad?",
         "It uses the book's central idea — assets put money in your pocket, liabilities take it out — as its rules. MY LIFE is independent and not affiliated with Robert Kiyosaki or the Rich Dad Company."),
        ("Is it free to play?",
         "Yes. No account, no install and no ads in the game. Saves live in your own browser."),
    ],
    "real-life-simulator": [
        ("What can you do in a real life simulator?",
         "Start at 18, take jobs, manage money, watch your health and stress, buy assets that pay you, and steer toward goals like owning a home or retiring early. It models the tradeoffs of real life, not just the fun parts."),
        ("How realistic is it?",
         "It is realistic about money and time: choices have costs, health can force you to sell at the worst moment, and passive income beats a bigger salary. It is a model, not a perfect replica of any one life."),
        ("Is it free and browser-based?",
         "Yes. It runs in any browser, needs no download or account, and has no ads inside the game."),
    ],
    "life-simulator-no-download": [
        ("Do I need to download or install anything?",
         "No. A normal game asks for an app-store login, an install that eats storage, a permission prompt and often an account. MY LIFE skips all of it — it is a webpage you open and play."),
        ("Can I play it on a school or work Chromebook?",
         "Yes. Because there is nothing to install, it runs anywhere a browser is allowed, including locked-down Chromebooks where app installs are blocked."),
        ("Is it really free?",
         "Yes. No account, no purchase and no ads inside the game. Your progress saves in your browser automatically."),
    ],
}

for d, items in FAQS.items():
    path = os.path.join(d, "index.html")
    if not os.path.exists(path):
        print("SKIP missing", path); continue
    h = open(path, encoding="utf-8").read()
    if "Frequently asked" in h:
        print("SKIP already has FAQ", d); continue

    # 1) HTML block: insert before </main>
    qa_html = '  <h2>Frequently asked</h2>\n'
    for q, a in items:
        qa_html += '  <p><strong>%s</strong> %s</p>\n' % (q, a)
    if "</main>" not in h:
        print("SKIP no </main> in", d); continue
    h = h.replace("</main>", qa_html + "</main>", 1)

    # 2) JSON-LD: insert before </head>
    main_entity = []
    for q, a in items:
        main_entity.append({
            "@type": "Question",
            "name": q,
            "acceptedAnswer": {"@type": "Answer", "text": a},
        })
    schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": main_entity,
    }
    schema_str = json.dumps(schema, ensure_ascii=False)
    block = '<script type="application/ld+json">\n%s\n</script>\n' % schema_str
    if "</head>" not in h:
        print("SKIP no </head> in", d); continue
    h = h.replace("</head>", block + "</head>", 1)

    open(path, "w", encoding="utf-8").write(h)
    print("added FAQ to", d, "(%d Q&A)" % len(items))
