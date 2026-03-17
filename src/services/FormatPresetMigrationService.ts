/*
 * Copyright (c) 2025 by frostime. All Rights Reserved.
 */
import * as vscode from 'vscode';

type LegacyFormatPreset = 'plain' | 'github';

const CONFIG_NAMESPACE = 'assembleCodeToPrompt';
const FORMAT_PRESET_SECTION = 'format.preset';
const LEGACY_PRESET_MAP: Record<LegacyFormatPreset, 'markdown'> = {
  plain: 'markdown',
  github: 'markdown'
};

function isLegacyFormatPreset(value: unknown): value is LegacyFormatPreset {
  return value === 'plain' || value === 'github';
}

function getMigratedPreset(value: unknown): 'markdown' | null {
  if (!isLegacyFormatPreset(value)) {
    return null;
  }

  return LEGACY_PRESET_MAP[value];
}

async function migrateConfigValue(
  config: vscode.WorkspaceConfiguration,
  value: unknown,
  target: vscode.ConfigurationTarget
): Promise<void> {
  const migratedPreset = getMigratedPreset(value);

  if (!migratedPreset) {
    return;
  }

  await config.update(FORMAT_PRESET_SECTION, migratedPreset, target);
}

export async function migrateLegacyFormatPreset(): Promise<void> {
  const rootConfig = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
  const rootInspect = rootConfig.inspect<string>(FORMAT_PRESET_SECTION);
  const updates: Array<Thenable<void>> = [];

  if (rootInspect) {
    updates.push(
      migrateConfigValue(rootConfig, rootInspect.globalValue, vscode.ConfigurationTarget.Global),
      migrateConfigValue(rootConfig, rootInspect.workspaceValue, vscode.ConfigurationTarget.Workspace)
    );
  }

  await Promise.all(updates);
}
