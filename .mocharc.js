module.exports = {
  require: [
    "ts-node/register",
    "jsdom-global/register",
    "./scripts/mock-css-modules.js",
    "./scripts/adapt-enzyme-to-react-16.js",
    "./scripts/chai-setup.js",
  ],
};
