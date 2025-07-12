/* Jest setup for integration tests */
import path from 'path';
import fs from 'fs';
import rimraf from 'rimraf';
import mockRequire from 'mock-require';
import dotenv from 'dotenv';

dotenv.config();

// expose helpers globally for converted tests
global.testTmpDir = (name) => {
  const dir = path.join(__dirname, name);
  if (fs.existsSync(dir)) rimraf.sync(dir);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
};

global.loadFresh = (modulePath) => {
  delete require.cache[require.resolve(modulePath)];
  // eslint-disable-next-line import/no-dynamic-require
  return require(modulePath);
};

global.mockRequire = mockRequire;

afterEach(() => {
  // clear all mocks after each test
  mockRequire.stopAll();
});
