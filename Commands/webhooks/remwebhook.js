/*
 This file is part of TrelloBot.
 Copyright (c) Snazzah ???-2019
 Copyright (c) Yamboy1 (and contributors) 2019

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU General Public License for more details.

 You should have received a copy of the GNU General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const { Command } = require("faux-classes");

module.exports = class RemoveWebhook extends Command {

  get name() { return "remwebhook"; }
  get cooldown() { return 1; }
  get permissions() { return ["auth", "trello-perm"]; }
  get aliases() { return ["-webhook", "delwebhook", "removewebhook", "deletewebhook"]; }
  get argRequirement() { return 1; }

  async exec(message, args, { user }) {
    try {
      const boardId = await this.client.util.getBoardId(user, args[0]);
      const { webhookId = undefined } = await this.client.data.get.webhookBoard(boardId) || {};
      if (webhookId === undefined) return message.reply("Could not find webhook.");

      const internalWebhooks = await this.client.trello.get.webhooks(user.trelloToken);
      const webhook = internalWebhooks.find(webhook => webhook.id === webhookId);
      if (webhook === undefined) await message.channel.send("Internal webhook not found, skipping...");
      else await this.client.trello.delete.webhook(user.trelloToken, webhook.id);

      await this.client.data.delete.webhook(message.guild.id, boardId);

      message.reply(`Deleted webhook for board \`${boardId}\`.`);
    } catch (e) {
      if (e === 404) {
        message.reply("Could not find webhook.");
      } else throw e;
    }
  }

  get helpMeta() {
    return {
      category: "Webhooks",
      description: "Deletes a webhook from a board.",
      usage: ["<boardID>"]
    };
  }
};