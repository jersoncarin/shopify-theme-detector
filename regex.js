const re = (pattern, str) => {
  const regex = pattern;
  let m;
  const matches = [];

  while ((m = regex.exec(str)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === regex.lastIndex) {
      regex.lastIndex++;
    }

    // The result can be accessed through the `m`-variable.
    m.forEach((match) => {
      matches.push(match);
    });
  }

  return matches;
};

const match = (matches) => {
  return matches.length === 2 ? matches[1] : matches[0];
};

module.exports = { re, match };
