const Y = require('yjs');

const doc1 = new Y.Doc();
doc1.getText('default').insert(0, 'aaa');
const state1 = Y.encodeStateAsUpdate(doc1);

const doc2 = new Y.Doc();
Y.applyUpdate(doc2, state1);
doc2.getText('default').insert(0, 'bbb');
const state2 = Y.encodeStateAsUpdate(doc2);

const doc3 = new Y.Doc();
Y.applyUpdate(doc3, state1);
doc3.getText('default').insert(3, 'c');
const state3 = Y.encodeStateAsUpdate(doc3);

const docMerge = new Y.Doc();
Y.applyUpdate(docMerge, state2);
Y.applyUpdate(docMerge, state3);

console.log('Merged:', docMerge.getText('default').toString());
