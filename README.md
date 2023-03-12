# MyGPT

MyGPT is a free, alternative UI for OpenAI chat models. It uses the same backend model
as ChatGPT. This project is not affiliated with OpenAI.

Use of this project requires a paid OpenAI developer plan and a valid API token.

This project aims to enable savvy users to use a ChatGPT-like product on a pay-per-use
pricing model instead of a monthly subscription. The code is provided without any
warranties, and it is not intended to be run as a public SaaS offering.

![Screenshot of MyGPT. Conversation reads as follows. You: who are you?  MyGPT: I am MyGPT, a helpful AI assistant designed to assist and answer questions. You: who created you? MyGPT: I was created by OpenAI. You: what can you do? MyGPT: I can assist with natural language processing tasks such as language translation, text summarization, question-answering, and more.](public/screenshot.png)

## Features

- [x] Basic conversation via OpenAI API
- [x] Streaming message generation
- [x] Code syntax highlighting
- [x] Persist conversation in local browser storage
- [x] Stop generating
- [x] Regenerate last response
- [ ] Configurable system prompt
- [ ] "Click to copy" code
- [ ] Token/cost estimator
- [ ] Edit messages
- [ ] Review past sessions
- [ ] Screenreader/accessibility hints
- [ ] Snazzy logo

## Setup

1. If you don’t have Node.js installed, [install it from here](https://nodejs.org/en/) (Node.js version >= 14.6.0 required)

2. Clone this repository

3. Navigate into the project directory

   ```bash
   $ cd mygpt
   ```

4. Install the requirements

   ```bash
   $ npm install
   ```

5. Make a copy of the example environment variables file

   On Linux systems:

   ```bash
   $ cp .env.example .env
   ```

   On Windows:

   ```powershell
   $ copy .env.example .env
   ```

6. Add your [API key](https://platform.openai.com/account/api-keys) to the newly created `.env` file

7. Run the app

   ```bash
   $ npm run dev
   ```

You should now be able to access the app at [http://localhost:3000](http://localhost:3000)!
