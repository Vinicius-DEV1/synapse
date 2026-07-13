export class PayloadOptimizer {
  /**
   * Recursively removes null and undefined properties to minimize payload size.
   */
  static optimize(obj: any): any {
    if (obj === null || obj === undefined) return undefined;
    if (typeof obj !== 'object') return obj;
    
    // Do not optimize standard classes like Date or Buffer/Uint8Array
    if (obj instanceof Date || obj instanceof Uint8Array || obj instanceof ArrayBuffer) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.optimize(item)).filter(item => item !== undefined);
    }
    
    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = this.optimize(obj[key]);
        if (val !== undefined) {
          result[key] = val;
        }
      }
    }
    return result;
  }
}
