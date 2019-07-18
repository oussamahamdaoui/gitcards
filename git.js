const { exec } = require('child_process');

const GitErrorCodes = {
  BadConfigFile: 'BadConfigFile',
  AuthenticationFailed: 'AuthenticationFailed',
  NoUserNameConfigured: 'NoUserNameConfigured',
  NoUserEmailConfigured: 'NoUserEmailConfigured',
  NoRemoteRepositorySpecified: 'NoRemoteRepositorySpecified',
  NotAGitRepository: 'NotAGitRepository',
  NotAtRepositoryRoot: 'NotAtRepositoryRoot',
  Conflict: 'Conflict',
  StashConflict: 'StashConflict',
  UnmergedChanges: 'UnmergedChanges',
  PushRejected: 'PushRejected',
  RemoteConnectionError: 'RemoteConnectionError',
  DirtyWorkTree: 'DirtyWorkTree',
  CantOpenResource: 'CantOpenResource',
  GitNotFound: 'GitNotFound',
  CantCreatePipe: 'CantCreatePipe',
  CantAccessRemote: 'CantAccessRemote',
  RepositoryNotFound: 'RepositoryNotFound',
  RepositoryIsLocked: 'RepositoryIsLocked',
  BranchNotFullyMerged: 'BranchNotFullyMerged',
  NoRemoteReference: 'NoRemoteReference',
  InvalidBranchName: 'InvalidBranchName',
  BranchAlreadyExists: 'BranchAlreadyExists',
  NoLocalChanges: 'NoLocalChanges',
  NoStashFound: 'NoStashFound',
  LocalChangesOverwritten: 'LocalChangesOverwritten',
  NoUpstreamBranch: 'NoUpstreamBranch',
  IsInSubmodule: 'IsInSubmodule',
  WrongCase: 'WrongCase',
  CantLockRef: 'CantLockRef',
  CantRebaseMultipleBranches: 'CantRebaseMultipleBranches',
  PatchDoesNotApply: 'PatchDoesNotApply',
  NoPathFound: 'NoPathFound',
};


const getGitErrorCode = (stderr) => {
  if (/Another git process seems to be running in this repository|If no other git process is currently running/.test(stderr)) {
    return GitErrorCodes.RepositoryIsLocked;
  }
  if (/Authentication failed/.test(stderr)) {
    return GitErrorCodes.AuthenticationFailed;
  }
  if (/Not a git repository/i.test(stderr)) {
    return GitErrorCodes.NotAGitRepository;
  }
  if (/bad config file/.test(stderr)) {
    return GitErrorCodes.BadConfigFile;
  }
  if (/cannot make pipe for command substitution|cannot create standard input pipe/.test(stderr)) {
    return GitErrorCodes.CantCreatePipe;
  }
  if (/Repository not found/.test(stderr)) {
    return GitErrorCodes.RepositoryNotFound;
  }
  if (/unable to access/.test(stderr)) {
    return GitErrorCodes.CantAccessRemote;
  }
  if (/branch '.+' is not fully merged/.test(stderr)) {
    return GitErrorCodes.BranchNotFullyMerged;
  }
  if (/Couldn\'t find remote ref/.test(stderr)) {
    return GitErrorCodes.NoRemoteReference;
  }
  if (/A branch named '.+' already exists/.test(stderr)) {
    return GitErrorCodes.BranchAlreadyExists;
  }
  if (/'.+' is not a valid branch name/.test(stderr)) {
    return GitErrorCodes.InvalidBranchName;
  }
  if (/Please,? commit your changes or stash them/.test(stderr)) {
    return GitErrorCodes.DirtyWorkTree;
  }
  return stderr;
};


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
    return new Promise((resolve, reject) => {
      exec([prefix, ...cmd].join(' '), {
        cwd: this.dir,
        env: this.env,
      }, (error, stdout, stderr) => {
        // console.log({ stdout, stderr });

        if (error) {
          reject(getGitErrorCode(stderr));
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

  async getGraph() {
    const cmd = ['log', '--all', '--date-order', '--pretty="%h|%p|%d"'];
    const stdout = await this.exec(cmd);
    return stdout;
  }
}

// tests
const ENV = require('./tokens.json');

(async () => {
  const git = new Git('/Users/oussamahamdaoui/Documents/gitCards/', ENV);
  console.log((await git.getGraph()));
})();
