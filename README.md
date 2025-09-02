# Wits Quest

[![codecov](https://codecov.io/gh/Girls-Girls-Inc/wits-quest/branch/dev/graph/badge.svg)](https://codecov.io/gh/Girls-Girls-Inc/wits-quest)


## Description
Wits Quest is a location-based game centred around landmarks at the University of the Witwatersrand campus.  
Players explore the campus, complete quests tied to real-world locations, and earn points while learning about Wits history and culture.  

This project was developed as part of our Software Design course.

## Group Members
- Kayisha Naidoo (2562592)  
- Clare Cordeiro (2621295)  
- Sefora Kapenga (2556863)  
- Jedidiah Kanju (2543799)  
- Lily de Melo (2545080)

## How to run the app locally
### Prerequisites
- [Node.js](https://nodejs.org/)  
- [npm](https://www.npmjs.com/)

### `.env` Setup
Our project uses environment variables for configuration—sensitive values (like API keys or secrets) must **not** be committed to version control.

1. Copy the template file:
Create two `.env` files in the following folders:
```
wits-quest/
├── app.js
├── backend
    └── .env
├── eslint.config.mjs
├── frontend
    └── .env
├── node_modules
├── package-lock.json
├── package.json
└── src
```
The `.env` files should have the following format:
#### `frontend/.env`
```
VITE_SUPABASE_URL=<your Supabase URL>
VITE_SUPABASE_ANON_KEY=<your Supabase Anonymous Key>
VITE_WEB_URL=http://localhost:3000
VITE_GOOGLE_MAPS_API_KEY=<your Google Maps Key>
```
#### `backend/.env`
```
SUPABASE_URL=<your Supabase URL>
SUPABASE_SERVICE_ROLE_KEY=<your Supabase Anonymous Key>
WEB_URL=http://localhost:3000
```
### Start the Server
This command installs all required dependencies and starts the server:

```bash
npm run serve
```

You should see the following output:

```yaml
Server Listening on PORT: 3000
```

Then, navigate to the application in your browser:

```
http://localhost:3000
```
For more information, please see our [Development Guide](https://github.com/Girls-Girls-Inc/wits-quest/wiki/Development-Guide)

## Project Management
Please find updates about our recent meetings [here](https://github.com/Girls-Girls-Inc/wits-quest/wiki/Project-Management-Methodology).

## Documentation
Please find all our documentation [here.](https://github.com/Girls-Girls-Inc/wits-quest/wiki)
