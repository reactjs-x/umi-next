import assert from 'assert';
import Service from './Service';
import { isValidPlugin, pathToObj } from './utils/pluginUtils';
import { PluginType, ServiceStage } from './enums';
import { ICommand, IHook, IPlugin, IPluginConfig, IPreset } from './types';

interface IOpts {
  id: string;
  key: string;
  service: Service;
}

export default class PluginAPI {
  id: string;
  key: string;
  service: Service;

  constructor(opts: IOpts) {
    this.id = opts.id;
    this.key = opts.key;
    this.service = opts.service;
  }

  registerCommand(command: ICommand) {
    const { name, fn } = command;
    assert(
      !this.service.commands[name],
      `api.registerCommand() failed, the command ${name} is exists.`,
    );
    this.service.commands[name] = command;
  }

  // TODO: reversed keys
  describe({
    id,
    key,
    config,
  }: { id?: string; key?: string; config?: IPluginConfig } = {}) {
    const { plugins } = this.service;
    // this.id and this.key is generated automatically
    // so we need to diff first
    if (id && this.id !== id) {
      if (plugins[id]) {
        const name = plugins[id].isPreset ? 'preset' : 'plugin';
        throw new Error(
          `api.describe() failed, ${name} ${id} is already registered by ${plugins[id].path}.`,
        );
      }
      plugins[id] = plugins[this.id];
      plugins[id].id = id;
      delete plugins[this.id];
      this.id = id;
    }
    if (key && this.key !== key) {
      this.key = key;
      plugins[this.id].key = key;
    }

    if (config) {
      plugins[this.id].config = config;
    }
  }

  // TODO: 考虑要不要兼容之前的写法
  register(hook: IHook) {
    assert(
      hook.key && typeof hook.key === 'string',
      `api.register() failed, hook.key must supplied and should be string, but got ${hook.key}.`,
    );
    assert(
      hook.fn && typeof hook.fn === 'function',
      `api.register() failed, hook.fn must supplied and should be function, but got ${hook.fn}.`,
    );
    this.service.hooksByPluginId[this.id] = (
      this.service.hooksByPluginId[this.id] || []
    ).concat(hook);
  }

  registerPresets(presets: (IPreset | string)[]) {
    assert(
      this.service.stage === ServiceStage.initPresets,
      `registerPresets should only used in presets.`,
    );
    if (!Array.isArray(presets)) presets = [presets];
    const extraPresets = presets.map(preset => {
      return isValidPlugin(preset as any)
        ? (preset as IPreset)
        : pathToObj(PluginType.preset, preset as string);
    });
    this.service._extraPresets.splice(0, 0, ...extraPresets);
  }

  // 在 preset 初始化阶段放后面，在插件注册阶段放前面
  registerPlugins(plugins: (IPlugin | string)[]) {
    assert(
      this.service.stage === ServiceStage.initPresets ||
        this.service.stage === ServiceStage.initPlugins,
      `api.registerPlugins() failed, it should only be used in registering stage.`,
    );
    if (!Array.isArray(plugins)) plugins = [plugins];
    const extraPlugins = plugins.map(plugin => {
      return isValidPlugin(plugin as any)
        ? (plugin as IPreset)
        : pathToObj(PluginType.plugin, plugin as string);
    });
    if (this.service.stage === ServiceStage.initPresets) {
      this.service._extraPlugins.push(...extraPlugins);
    } else {
      this.service._extraPlugins.splice(0, 0, ...extraPlugins);
    }
  }

  skipPlugins(pluginIds: string[]) {
    pluginIds.forEach(pluginId => {
      this.service.skipPluginIds.add(pluginId);
    });
  }
}