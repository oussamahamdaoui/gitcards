const { exec } = require('child_process');


class Git {
  /**
   *
   * @param {String} dir
   */
  constructor(dir, env) {
    this.dir = dir;
    this.env = {
      ...env,
      HOME: process.env.HOME,
      PATH: process.env.PATH,
    };
  }

  /**
   *
   * @param {[String]} cmd the command to be executed no need to specify git
   * @param {String} prefix default is git but you can set it to ''
   * @return {String} the stdout string
   *
   */
  async exec(cmd, prefix = 'git') {
    console.log([prefix, ...cmd]);
    return new Promise((resolve, reject) => {
      exec([prefix, ...cmd].join(' '), {
        cwd: this.dir,
        env: this.env,
      }, (error, stdout, stderr) => {
        // console.log({ stdout, stderr });

        if (error) {
          reject(stderr);
          return;
        }
        resolve(stdout);
      });
    });
  }

  /**
   * @return {[String]}
   */
  async getBranches() {
    const stdout = await this.exec(['branch', '--all']);
    return stdout.split(/\n/).map(e => e.replace(/\*|\s/g, '')).filter(e => !!e);
  }

  /**
   *
   * @param {String} name branch name
   */

  async createBrach(name) {
    await this.exec(['branch', name]);
  }

  /**
   *
   * @param {String} name branch name
   * @param {boolean} force
   */
  async removeBranch(name, force = false) {
    const cmd = ['branch', name, '--delete'];
    if (force) {
      cmd.push('--force');
    }
    await this.exec(cmd);
  }

  /**
   *
   * @param {String} message
   */
  async commit(message) {
    const cmd = ['commit', '-m', `"${message}"`];
    await this.exec(cmd);
  }


  async getCurrentBranch() {
    const stdout = await this.exec(['branch', '--all']);
    return stdout
      .split(/\n/)
      .find(e => e.indexOf('*') !== -1)
      .replace(/\*|\s/g, '');
  }

  /**
   *
   * @param {[String]} flies list of files default all
   */
  async add(flies = ['.']) {
    await this.exec(['add', ...flies]);
  }

  async push() {
    await this.exec(['push']);
  }

  async pushUpStream(name) {
    let branchName;
    if (!name) {
      branchName = await this.getCurrentBranch();
    } else {
      branchName = name;
    }
    await this.exec(['push', '--set-upstream', 'origin', branchName]);
  }

  /**
   *
   * @param {String} name branch name
   * @param {boolean} create if true creates the branch
   */
  async checkout(name, create) {
    const cmd = ['checkout'];
    if (create) {
      cmd.push('-b');
    }
    cmd.push(name);
    await this.exec(cmd);
  }

  async createGithubPR(text) {
    const cmd = [`${__dirname}/hub`, 'pull-request', '-m', `"${text}"`];
    await this.exec(cmd, '');
  }
}

// tests
const ENV = require('./tokens.json');

(async () => {
  const git = new Git('/Users/oussamahamdaoui/Documents/gitCards/', ENV);
  console.log((await git.getBranches()));

  await git.add();
  await git.commit('feat: add create pr');
  await git.push();
  await git.createGithubPR('add create pr');
})();
