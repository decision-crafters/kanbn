module.exports = (() => {
  const tags = {
    b: 'bold',
    d: 'dim',
  };

  return {

    /**
     * Show an error message in the console
     * @param {Error|string} error
     * @param {boolean} dontExit
     */
    error(errorInstance, dontExit = false) {
      let message;
      if (errorInstance instanceof Error) {
        message = process.env.DEBUG === 'true'
          ? errorInstance
          : this.replaceTags(errorInstance.message);
      } else {
        message = this.replaceTags(errorInstance);
      }
      console.error(message);
      if (!dontExit && process.env.KANBN_ENV !== 'test') {
        process.exit(1);
      }
    },

    /**
     * Show a warning message in the console
     * @param {Error|string} warning
     */
    warning(warningInstance) {
      // Skip warnings if KANBN_QUIET is set to true
      if (process.env.KANBN_QUIET === 'true') {
        return;
      }

      let message;
      if (warningInstance instanceof Error) {
        message = process.env.DEBUG === 'true'
          ? warningInstance
          : this.replaceTags(warningInstance.message);
      } else {
        message = this.replaceTags(warningInstance);
      }
      console.warn('\x1b[33mWarning:\x1b[0m', message);
    },

    /**
     * Log debug message
     * @param {string} message - Debug message
     */
    debugLog(message) {
      // Only show debug messages if DEBUG environment variable is set
      if (process.env.DEBUG === 'true') {
        // Prefix with [DEBUG] for searchability in logs
        console.log(`[DEBUG] ${message}`);
      }
    },

    /**
     * Convert a string to simplified paramcase, e.g:
     *  PascalCase -> pascalcase
     *  Test Word -> test-word
     * @param {string} s The string to convert
     * @return {string} The converted string
     */
    paramCase(s) {
      if (s === null || s === undefined) return '';
      // Handle empty string separately to avoid issues with subsequent processing
      if (s.trim() === '') return '';

      let result = s;

      // Insert hyphen between camelCase (e.g., myWord -> my-Word)
      // and also after acronyms followed by a capitalized word (e.g., HVACSystem -> HVAC-System)
      // This regex looks for a lowercase letter or digit followed by an uppercase letter OR
      // an uppercase letter followed by an uppercase letter and then a lowercase letter (for acronyms like HVACSystem)
      result = result
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2');

      // Convert to lowercase
      result = result.toLowerCase();

      // Split by non-alphanumeric characters (now hyphen is NOT a separator here initially)
      // and other common separators. Filter out empty strings.
      // eslint-disable-next-line max-len
      const separatorRegex = /[\s!?.,@:;|\\/"'`{}[\]()<>~#+_¬=]+/g; // Removed £$%^&*
      result = result
        .split(separatorRegex)
        .filter((part) => part.length > 0)
        .join('-');

      // Remove any leading or trailing hyphens that might have formed
      // and ensure no multiple hyphens.
      result = result.replace(/^-+|-+$/g, '').replace(/-+/g, '-');

      return result;
    },

    /**
     * Get a task id from the task name
     * @param {string} name The task name
     * @return {string} The task id
     */
    getTaskId(name) {
      return this.paramCase(name);
    },

    /**
     * Convert an argument into a string. If the argument is an array of strings, concatenate them or use the
     * last element
     * @param {string|string[]} arg An argument that might be a string or an array of strings
     * @param {boolean} [all=false] If true and arg is array, join all elements; otherwise use last.
     * @return {string} The argument value as a string, or the original argument if not string/array.
     */
    strArg(arg, all = false) {
      if (Array.isArray(arg)) {
        // Handle empty array explicitly
        if (arg.length === 0) {
          return '';
        }
        // eslint-disable-next-line max-len
        return all ? arg.join(',') : arg.pop();
      }
      // For non-array inputs, return them directly
      return arg;
    },

    /**
     * Convert an argument into an array. If the argument is a string, return it as a single-element array
     * @param {string|string[]} arg An argument that might be a string or an array of strings
     * @return {string[]} The argument value as an array
     */
    arrayArg(arg) {
      if (Array.isArray(arg)) {
        return arg;
      }
      return [arg];
    },

    /**
     * Remove escape characters ('/' and '\') from the beginning of a string
     * @param {string} s The string to trim
     */
    trimLeftEscapeCharacters(s) {
      // eslint-disable-next-line max-len
      return s.replace(/^[\\/]+/, '');
    },

    /**
     * Compare two dates using only the date part and ignoring time
     * @param {Date} a
     * @param {Date} b
     * @return {boolean} True if the dates are the same
     */
    compareDates(a, b) {
      const aDate = new Date(a);
      const bDate = new Date(b);
      aDate.setHours(0, 0, 0, 0);
      bDate.setHours(0, 0, 0, 0);
      return aDate.getTime() === bDate.getTime();
    },

    /**
     * If a is undefined, convert it to a number or string depending on the specified type
     * @param {*} a
     * @param {string} type
     * @return {string|number}
     */
    coerceUndefined(a, type) {
      if (a === undefined) {
        switch (type) {
          case 'string':
            return '';
          default:
            return 0;
        }
      }
      return a;
    },

    /**
     * Make a string bold
     * @param {string} s The string to wrap
     * @return {string} The updated string
     */
    bold(s) {
      return `\x1b[1m${s}\x1b[0m`;
    },

    /**
     * Make a string dim
     * @param {string} s The string to wrap
     * @return {string} The updated string
     */
    dim(s) {
      return `\x1b[2m${s}\x1b[0m`;
    },

    /**
     * Replace tags like {x}...{x} in a string
     * @param {string} s The string in which to replace tags
     * @return {string} The updated string
     */
    replaceTags(inputStr) { // Renamed s to inputStr to avoid shadowing
      let resultStr = inputStr; // Use a new variable for modifications
      // eslint-disable-next-line no-restricted-syntax, guard-for-in
      for (const tag in tags) {
        const r = new RegExp(`{${tag}}(.+?){${tag}}`, 'g'); // Use non-greedy match instead of [^{]+
        // The callback's second argument 's' shadows the outer 's' if not careful.
        // Let's rename it to 'matchContent' to be clear.
        resultStr = resultStr.replace(r, (fullMatch, matchContent) => {
          const transformer = this[tags[tag]];
          // Try explicitly setting context with .call()
          const transformed = transformer.call(this, matchContent);
          return transformed;
        });
      }
      return resultStr;
    },

    /**
     * Zip 2 arrays together, i.e. ([1, 2, 3], [a, b, c]) => [[1, a], [2, b], [3, c]]
     * @param {any[]} a
     * @param {any[]} b
     * @return {any[]}
     */
    zip: (a, b) => a.map((k, i) => [k, b[i]]),
  };
})();
