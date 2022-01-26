const silenceWarning = () => {
  const origWarning = process.emitWarning;
  process.emitWarning = function (...args) {
    if (args[2] !== "DEP0005") {
      // pass any other warnings through normally
      return origWarning.apply(process, args);
    }
  };
};

export default silenceWarning;
