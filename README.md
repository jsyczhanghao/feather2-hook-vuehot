# feather2-hook-vuehot

feather2的vue模块热更新，无需刷新页面，修改.vue文件即可看到效果，同webpack
注: 只有dev或者debug 环境下，启动watch功能此功能才会生效

### 使用

```sh
npm install feather2-hook-vuehot --save-dev
```

conf/conf.js

```js
feather.hook('vuehot');
//如果ip不对，可进行设置, 正常为127.0.0.1
feather.config.set('livereload.hostname', 'ip');
```