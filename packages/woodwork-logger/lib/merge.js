module.exports = function merge(obj1, obj2) {
  const obj3 = {};
  for (let prop in obj1) obj3[prop] = obj1[prop];
  for (let prop in obj2) obj3[prop] = obj2[prop];
  return obj3;
}
