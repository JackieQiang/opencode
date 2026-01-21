export const dict = {
  'command.category.suggested': 'Suggested',
  'command.category.view': 'View',
  'command.category.project': 'Project',
  'command.category.provider': 'Provider',
  'command.category.server': 'Server',
  'command.category.session': 'Session',
  'command.category.theme': 'Theme',
  'command.category.language': 'Language',
  'command.category.file': 'File',
  'command.category.terminal': 'Terminal',
  'command.category.model': 'Model',
  'command.category.mcp': 'MCP',
  'command.category.agent': 'Agent',
  'command.category.permissions': 'Permissions',

  'theme.scheme.system': 'System',
  'theme.scheme.light': 'Light',
  'theme.scheme.dark': 'Dark',

  'command.session.new': 'New Session',
  'command.file.open': 'Open File',
  'command.file.open.description': 'Search files and commands',
  'command.terminal.toggle': 'Toggle Terminal',
  'command.review.toggle': 'Toggle Review',
  'command.steps.toggle': 'Toggle Steps',
  'command.message.previous': 'Previous Message',
  'command.message.next': 'Next Message',
  'command.model.choose': 'Choose Model',
  'command.agent.cycle': 'Cycle Agent',
  'command.permissions.autoaccept.enable': 'Auto-accept Edits',
  'command.session.undo': 'Undo',
  'command.session.redo': 'Redo',
  'command.session.compact': 'Compact Session',
  'command.session.fork': 'Fork from Message',
  'command.session.share': 'Share Session',

  'palette.search.placeholder': 'Search files and commands',
  'palette.empty': 'No results found',
  'palette.group.commands': 'Commands',
  'palette.group.files': 'Files',

  'common.search.placeholder': 'Search',
  'common.loading': 'Loading',
  'common.cancel': 'Cancel',
  'common.submit': 'Submit',
  'common.save': 'Save',
  'common.attachment': 'Attachment',

  'prompt.placeholder.shell': 'Enter shell command...',
  'prompt.placeholder.normal': 'Ask anything...',

  'prompt.popover.emptyResults': 'No matching results',
  'prompt.popover.emptyCommands': 'No matching commands',
  'prompt.dropzone.label': 'Drop images here',

  'toast.permissions.autoaccept.on.title': 'Auto-accept Edits Enabled',
  'toast.permissions.autoaccept.off.title': 'Auto-accept Edits Disabled',
  'toast.file.loadFailed.title': 'Failed to load file',
  'toast.session.share.success.title': 'Session shared',

  'session.tab.session': 'Session',
  'session.tab.review': 'Review',
  'session.tab.context': 'Context',
  'session.review.empty': 'No changes in this session',

  'home.recentProjects': 'Recent Projects',
  'home.empty.title': 'No recent projects',
  'home.empty.description': 'Get started by opening a local project',

  'terminal.loading': 'Loading terminal...',
  'terminal.title': 'Terminal',

  'error.page.title': 'Something went wrong',
  'error.page.description': 'An error occurred while loading the application.',

  'settings.tab.general': 'General',
  'settings.tab.shortcuts': 'Shortcuts',
} as const

export type I18nKeys = keyof typeof dict
