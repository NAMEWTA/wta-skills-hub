# 发布 @namewta/skills-hub

核对日期：2026-10-06。源码版本升级为 0.1.0 **不是发布状态证明**；只有 npm registry 中该版本可读取且 tarball 验证通过才记为正式上线。

## 首次配置（维护者操作）

在 npm 的包设置中确认拥有 `@namewta/skills-hub` 的发布权限，账户开启 2FA。为本包添加 GitHub Actions trusted publisher：owner `NAMEWTA`，repository `wta-skills-hub`，workflow filename **`release.yml`**，environment **`npm`**。需要允许 `npm stage publish`；只有确实需要手动直接发布时才允许 `npm publish`。

在 GitHub 配置同名 environment `npm`，设置所需审查者和适当 tag 规则。配置受组织/套餐能力约束；本轮不会代建认证关系、改账户权限或处理 2FA。新的工作流不再读取长期 `NPM_TOKEN`，也不会缺少凭证后输出“跳过”却让发布显示成功。迁移时先验证 OIDC，再由维护者决定撤销旧 token，不擅自删除现有凭证。

Trusted publishing 使用 GitHub 托管 runner、`id-token: write`。本仓库固定 Node 24 与 npm 11.21.0；当前 staged publishing 至少要求 npm 11.15.0、Node 22.14.0。环境和 workflow 文件名必须与 npm 中的可信关系一致。`actions/setup-node` 不设置 `registry-url`：该项会写入 `_authToken`，npm 会拿这个令牌而不是 OIDC 去访问 registry。2026-10-09 标签推送 run `37881457590` 因此在 provenance 已签名后返回 `E401`。去掉 `registry-url` 后，run `37881775594` 返回 `ENEEDAUTH`：registry 没有接受 `release.yml` / environment `npm` 的 OIDC 身份，stage 没有创建。`npm whoami` 不能验证 OIDC 发布授权；以实际 stage/publish 的结果为准。

## 常规发版

在通过审查并合并的提交上确认 package.json 和 package-lock.json 都是期望版本，执行：

```bash
npm ci --ignore-scripts
npm run typecheck
npm run validate
npm test
npm run smoke:package -- --network
npm pack
```

审查打包文件列表，没有凭证、测试缓存或开发依赖混入；再创建与版本完全相同的 tag，例如 `v0.1.0`。推送该 tag 会运行 Release 并**默认 stage**。也可手工运行 Release，传入一个**已经存在**的 tag；工作流不创建、覆盖或删除 tag，不删除分支，不自动合并 PR。

Release 校验 tag 格式、tag 的实际提交、与 main 的祖先关系、package/lock 版本，重新运行检查及生产安装 smoke，上传用于审核的 tarball，并通过 OIDC 提交**该 tarball**。并发发布按 tag 串行，不自动取消已经开始的发布。

维护者从运行日志取得 stage ID，登录自己的 npm 账户后审阅并批准：

```bash
npm stage view <stage-id>
npm stage download <stage-id>
# 审查来源与内容后再执行；此步会要求 2FA
npm stage approve <stage-id>
```

Stage 成功并不意味着已发布。不能使用 OIDC 自动执行需要用户现场认证的 approve。需要直接上线时，手工 dispatch 的 `publish_mode` 选择 `direct`；仅在已通过 environment 审查、可信发布者允许 direct 的情况下调用 `npm publish`。不自动从 stage 失败降级到直接发布，不自动拒绝旧 stage、删除旧版本或移动 dist-tag。

## 上线核验

确认 `npm view @namewta/skills-hub@0.1.0 version dist.integrity` 返回期望版本与包完整性；在干净目录运行 `npx @namewta/skills-hub@0.1.0 --list --json` 和有完整参数的 `--dry-run`。再在专门测试项目完成菜单安装。核对 provenance 来源为本仓库对应 workflow/commit，单独记录客户端发现结果。

失败时保留日志并检查可信关系、环境名、现有 stage/版本冲突、Node/npm 版本。不得靠重建同名 tag、删除 release、关 TLS 或扩大 token 权限盲目重试。

## 官方依据

- [NPM trusted publishing](https://docs.npmjs.com/trusted-publishers/)：OIDC、GitHub 托管 runner、可信关系和命令权限、自动 provenance。
- [Staged publishing](https://docs.npmjs.com/staged-publishing/)：版本门槛、提交—审阅—2FA 批准，批准前不公开真实包内容。
- [npm stage 命令](https://docs.npmjs.com/cli/v12/commands/npm-stage/)：接受 package-spec、stage ID、审批与 tag 行为。

发布权限配置、真实 OIDC stage、2FA 批准及 registry 上线核验需要分别记录；不能由离线测试结果推定已经完成。
