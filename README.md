# Kanbn

A CLI kanban board application with AI-powered task management features.

Documentation can be found at [https://decision-crafters.github.io/kanbn/](https://decision-crafters.github.io/kanbn/).

## Installation

```bash
npm install -g @tosin2013/kanbn
```

## Usage

```
Usage:
  kanbn ......... Show help menu
  kanbn <command> [options]

Where <command> is one of:
  help .......... Show help menu
  version ....... Show package version
  init .......... Initialise kanbn board
  board ......... Show the kanbn board
  task .......... Show a kanbn task
  add ........... Add a kanbn task
  edit .......... Edit a kanbn task
  rename ........ Rename a kanbn task
  move .......... Move a kanbn task to another column
  comment ....... Add a comment to a task
  remove ........ Remove a kanbn task
  find .......... Search for kanbn tasks
  status ........ Get project and task statistics
  sort .......... Sort a column in the index
  sprint ........ Start a new sprint
  burndown ...... View a burndown chart
  validate ...... Validate index and task files
  archive ....... Archive a task
  restore ....... Restore a task from the archive
  remove-all .... Remove the kanbn board and all tasks
  decompose ..... Use AI to break down tasks into subtasks
  chat .......... Chat with AI project assistant
```

## Development

### Documentation

To run the documentation site locally:

1. Install dependencies:
   ```bash
   npm run docs:install
   ```

2. Start the documentation server:
   ```bash
   npm run docs
   ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
