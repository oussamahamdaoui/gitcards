const { exec } = require('child_process');

const HUB_PATH = `${__dirname}/hub`;

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


/**
 *
 * @param {String} stderr console error output
 * @return {String} code error or output if error unknown
 */
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
  if (/Couldn't find remote ref/.test(stderr)) {
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


/**
 * Git class helps you use some git comands in node js
 * this class uses hub binary
 *
 */

class Git {
  /**
   *
   * @param {String} dir
   * @param {Object} env environment variables like tokens where the key is the variable name
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
   * Executes a hub cmd
   * @param {[String]} cmd
   */

  async hubExec(cmd) {
    return this.exec(cmd, HUB_PATH);
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
   * @param {String} title the title of the message
   * @param {String} message the body
   *
   */
  async commit(title, message = '') {
    const cmd = ['commit', '-m', `"${title}\n${message}"`];
    await this.exec(cmd);
  }

  /**
   * @return {String} name of current branch
   */

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

  /**
   * Push
   */

  async push() {
    await this.exec(['push']);
  }

  /**
   * If name not specified uses the current branch name
   * cmd: git push --set-upstream origin name
   * @param {String} name
   */

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

  /**
   *
   * @param {String} text first line is pr title next lines are body
   *
   */
  async createGithubPR(text) {
    const cmd = ['pull-request', '-m', `"${text}"`];
    await this.hubExec(cmd);
  }

  /**
   * This uses the github token to clone projects
   * @param {String} url
   */

  async cloneGitHub(url) {
    const cmd = ['clone', url];
    return this.hubExec(cmd);
  }

  /**
   * This uses the github token to fork project
   * @param {String} remoteName
   */
  async forkGithub(remoteName) {
    const cmd = ['fork', `--remote-name=${remoteName}`];
    return this.hubExec(cmd);
  }

  /**
   * This uses the github token to create repo
   * @param {String} description default empty
   */

  async createGithubRepo(description = '') {
    const cmd = ['create', '-d', description];
    return this.hubExec(cmd);
  }

  /**
   * TO DO
   *
   *
   */
  async getGraph() {
    const cmd = ['log', '--all', '--date-order', '--source'];
    const stdout = await this.exec(cmd);
    return stdout.trim().split(/\n/g);
  }
}

export default Git;
