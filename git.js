const { exec } = require('child_process');

/**
 *
 * @param {String} dir the directory the comand should be executed
 * @param {[String]} cmd
 */
const ex = (dir, cmd) => new Promise((resolve, reject) => {
  exec(['git', ...cmd].join(' '), {
    cwd: dir,
  }, (error, stdout, stderr) => {
    // console.log({ stdout, stderr });

    if (error) {
      reject(stderr);
      return;
    }
    resolve(stdout);
  });
});

class Git {
  /**
   *
   * @param {String} dir
   */
  constructor(dir) {
    this.dir = dir;
  }

  /**
   *
   * @param {[String]} cmd the command to be executed no need to specify git
   *
   * @return {String} the stdout string
   */
  async exec(cmd) {
    return ex(this.dir, cmd);
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

  async push() {
    await this.exec(['push']);
  }
}

// tests
(async () => {
  const git = new Git('./');
  console.log((await git.getBranches()));
})();
