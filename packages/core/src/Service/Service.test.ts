import { join } from 'path';
import { winPath } from '@umijs/utils';
import Service from './Service';
import { IApplyPluginsType } from './enums';

const fixtures = join(__dirname, 'fixtures');

test('normal', async () => {
  const cwd = join(fixtures, 'normal');
  const service = new Service({
    cwd,
    presets: [
      require.resolve(join(cwd, 'preset_1')),
      require.resolve(join(cwd, 'preset_2')),
    ],
    plugins: [
      require.resolve(join(cwd, 'plugin_1')),
      require.resolve(join(cwd, 'plugin_2')),
    ],
  });
  expect(service.pkg).toEqual({ name: 'foo' });
  expect(service.initialPresets.map(p => p.key)).toEqual(['index', 'index']);
  expect(service.initialPlugins.map(p => p.key)).toEqual([
    'plugin1',
    'plugin2',
  ]);

  await service.init();
  const plugins = Object.keys(service.plugins).map(id => {
    const type = service.plugins[id].isPreset ? 'preset' : 'plugin';
    return `[${type}] ${id.replace(winPath(cwd), '.')}`;
  });
  expect(plugins).toEqual([
    '[preset] ./preset_1/index.js',
    '[preset] ./preset_1/preset_1/index.js',
    '[preset] ./preset_2/index.js',
    '[plugin] ./preset_1/plugin_1.js',
    '[plugin] ./preset_1/plugin_2.js',
    '[plugin] ./preset_1/preset_1/plugin_1.js',
    '[plugin] ./preset_2/plugin_1.js',
    '[plugin] ./plugin_1.js',
    '[plugin] ./plugin_2.js',
  ]);

  expect(service.hooks['foo'].length).toEqual(2);

  const ret = await service.applyPlugins({
    key: 'foo',
    type: IApplyPluginsType.add,
  });
  expect(ret).toEqual(['a', 'a']);
});

test('use built-in', () => {
  const service = new Service({
    cwd: join(fixtures, 'normal'),
    useBuiltIn: true,
  });
  expect(service.initialPresets[0].id).toEqual('@umijs/preset-built-in');
});

test('no package.json', () => {
  const service = new Service({
    cwd: join(fixtures, 'no-package-json'),
  });
  expect(service.pkg).toEqual({});
});

test('applyPlugin with add', async () => {
  const cwd = join(fixtures, 'applyPlugins');
  const service = new Service({
    cwd,
    plugins: [require.resolve(join(cwd, 'add'))],
  });
  await service.init();
  const ret = await service.applyPlugins({
    key: 'test',
    type: IApplyPluginsType.add,
  });
  expect(ret).toEqual(['a', 'b', 'c', 'd']);
});

test('applyPlugin with add failed with non-array initialValue', async () => {
  const cwd = join(fixtures, 'applyPlugins');
  const service = new Service({
    cwd,
    plugins: [require.resolve(join(cwd, 'add'))],
  });
  await service.init();
  await expect(
    service.applyPlugins({
      key: 'test',
      type: IApplyPluginsType.add,
      initialValue: '',
    }),
  ).rejects.toThrow(/opts.initialValue must be Array if opts.type is add/);
});

test('applyPlugin with modify', async () => {
  const cwd = join(fixtures, 'applyPlugins');
  const service = new Service({
    cwd,
    plugins: [require.resolve(join(cwd, 'modify'))],
  });
  await service.init();
  const ret = await service.applyPlugins({
    key: 'test',
    type: IApplyPluginsType.modify,
    initialValue: [],
  });
  expect(ret).toEqual(['a', 'b', 'c', 'd']);
});

test('applyPlugin with event', async () => {
  const cwd = join(fixtures, 'applyPlugins');
  const service = new Service({
    cwd,
    plugins: [require.resolve(join(cwd, 'event'))],
  });
  await service.init();
  let count = 0;
  const ret = await service.applyPlugins({
    key: 'test',
    type: IApplyPluginsType.event,
    args: {
      increase(step: number) {
        count += step;
      },
    },
  });
  expect(count).toEqual(3);
});

test('applyPlugin with unsupported type', async () => {
  const cwd = join(fixtures, 'applyPlugins');
  const service = new Service({
    cwd,
  });
  await service.init();
  await expect(
    service.applyPlugins({
      key: 'test',
      type: 'unsupport-event' as IApplyPluginsType,
    }),
  ).rejects.toThrow(/type is not defined or is not matched, got/);
});

test('registerPlugin id conflict', async () => {
  const cwd = join(fixtures, 'registerPlugin-conflict');
  const service = new Service({
    cwd,
    plugins: [
      require.resolve(join(cwd, 'plugin_1')),
      require.resolve(join(cwd, 'plugin_2')),
    ],
  });
  await expect(service.init()).rejects.toThrow(
    /plugin foo is already registered by/,
  );
});

test('registerPlugin id conflict (preset)', async () => {
  const cwd = join(fixtures, 'registerPlugin-conflict');
  const service = new Service({
    cwd,
    presets: [
      require.resolve(join(cwd, 'preset_1')),
      require.resolve(join(cwd, 'preset_2')),
    ],
  });
  await expect(service.init()).rejects.toThrow(
    /preset foo is already registered by/,
  );
});