declare module 'sql.js' {
  export type Database = any
  const initSqlJs: (...args: any[]) => Promise<{
    Database: new (...ctorArgs: any[]) => Database
  }>
  export default initSqlJs
}
