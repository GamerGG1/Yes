/*
 This file is part of TrelloBot.
 Copyright (c) Snazzah (and contributors) 2016-2020

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

const fs = require('fs');
const M = require('mustache');
const path = require('path');
const logger = require('./logger')('[LOCALE]');
const reload = require('require-reload')(require);
const lodash = require('lodash');

class LocaleHandler {
  constructor(client, cPath) {
    this.locales = new Map();
    this.path = path.resolve(cPath);
    this.logger = logger;
    this.config = client.config;
  }

  iterateFolder(folderPath) {
    const files = fs.readdirSync(folderPath);
    files.map(file => {
      const filePath = path.join(folderPath, file);
      const stat = fs.lstatSync(filePath);
      if (stat.isSymbolicLink()) {
        const realPath = fs.readlinkSync(filePath);
        if (stat.isFile() && file.endsWith('.json')) {
          this.load(realPath);
        } else if (stat.isDirectory()) {
          this.iterateFolder(realPath);
        }
      } else if (stat.isFile() && file.endsWith('.json'))
        this.load(filePath);
      else if (stat.isDirectory())
        this.iterateFolder(filePath);
    });
  }

  get source() {
    return this.locales.get(this.config.sourceLocale);
  }

  load(filePath) {
    logger.info('Loading locale', filePath);
    const json = reload(filePath);
    this.locales.set(path.parse(filePath).name, json);
  }

  reload() {
    this.locales.clear();
    this.iterateFolder(this.path);
  }

  createModule(locale, prefixes = {}){
    const _ = (string, params = {}) => {
      const localeJSON = this.locales.get(locale);
      const source = this.locales.get(this.config.sourceLocale);
      const localeBase = localeJSON ? lodash.defaultsDeep(localeJSON, source) : source;
      const localeString = lodash.get(localeBase, string);
      if (!params.prefix) params.prefix = prefixes.raw;
      if (!params.cleanPrefix) params.cleanPrefix = prefixes.clean;
      if (!localeString)
        throw new Error(`No string named '${string}' was found in the source translation.`);
      return M.render(localeString, params);
    };

    _.valid = string => {
      const localeJSON = this.locales.get(locale);
      const source = this.locales.get(this.config.sourceLocale);
      const localeBase = localeJSON ? lodash.defaultsDeep(localeJSON, source) : source;
      return lodash.has(localeBase, string);
    };

    _.numSuffix = (string, value, params) => {
      const suffixTable = [
        [0, 'zero'], [1, 'one'], [2, 'two'],
        [3, 'three'], [4, 'four'], [5, 'five']
      ];

      for (const i in suffixTable) {
        const suffix = suffixTable[i];
        if (value !== suffix[0]) continue;
        if (value === suffix[0] && _.valid(`${string}.${suffix[1]}`))
          return _(`${string}.${suffix[1]}`, params);
      }
      return _(`${string}.many`, params);
    };

    _.toLocaleString = number =>
      number.toLocaleString((locale || this.config.sourceLocale).replace('_', '-'));

    _.locale = locale || this.config.sourceLocale;

    _.json = () => {
      const localeJSON = this.locales.get(locale);
      const source = this.locales.get(this.config.sourceLocale);
      const localeBase = localeJSON ? lodash.defaultsDeep(localeJSON, source) : source;
      return localeBase;
    };

    return _;
  }
}

module.exports = LocaleHandler;