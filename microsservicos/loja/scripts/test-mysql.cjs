const {spawnSync}=require('child_process');
const result=spawnSync(process.execPath,['--import','tsx','--test','tests/mysql-eventos.integration.ts'],{stdio:'inherit',env:{...process.env,DB_DRIVER:'mysql'}});
process.exitCode=result.status??1;
