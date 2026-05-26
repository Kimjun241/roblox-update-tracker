# Roblox Update Tracker

A simple program that notifies you of Roblox updates, I made this quick little script in about 30 minutes for my Roblox Offsets server (https://discord.gg/5bAtkh6uJb).
If you don't want to run this yourself, you can join my Discord and get the update notification roles.

This is designed to be ran as a background process (ideally on a server). You can modify the code as you wish and add functionallity.

# Instructions

### Node.js Setup

You can skip this if you already have Node.js installed.

1. Download Node.js from https://nodejs.org/en/download
2. Install Node.js, making sure you select the option for adding to PATH

### Install Dependencies

You need 3 dependencies for this script to work. Required dependencies:
- `@replit/node-fetch`
- `fs`
- `path`

1. Open a command prompt by opening the folder in File Explorer and at the top where the file path is displayed, click it so you are typing and type in `cmd` and press enter
2. Once the command prompt is open, paste this command and press enter `npm i @replit/node-fetch fs path`
3. Keep the command prompt open, as you will need it again later

### Config Setup

You will NEED to update `WebhookURL` and `PingRoleID`, but the other options can stay as the default if you would like.

1. Open the file `config.json` in notepad or a code editor
2. Create a Discord Webhook, if you do not know how you can follow [this](https://www.geeksforgeeks.org/websites-apps/how-to-make-a-webhook-in-discord) guide **up to step 5**
3. When you copy your webhook it will be in a format like `/api/webhooks/0000000000000000/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx_xxxxxxxxxxx`, you need to edit this to be in a format like `/api/v10/webhooks/0000000000000000/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx_xxxxxxxxxxx?wait=true&with_components=true` if you want the download button to work on the embed.
4. Replace `webhook url here` in `config.json` with your modified webhook, make sure it has quotes around it
5. Now get the Role ID of the role you want to ping when an update happens, you can get it by following [this](https://docs.monni.fyi/blog/role-id) guide if you don't know how
6. Replace `role id here` in `config.json` with the Role ID you copied
7. Save and close `config.json`

### Optional Config Setup

If you would like, you can also edit the footer text and icon as well as the embed descriptions, but you can leave them as their defaults if you would like.

### Start the application

1. You will need the command prompt again, if you closed it follow the step 1 from `Install Dependencies`
2. Type out or paste the command `node .` and press enter, it should say `update tracker running`
3. You must leave this command prompt open or the update tracker will stop working