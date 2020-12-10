const safeInterval = (method, time) => {
  let timeout;

  const loop = () => {
    timeout = setTimeout(() => {
      method();
      loop();
    }, time);
  };

  loop();
};

module.exports = safeInterval;
