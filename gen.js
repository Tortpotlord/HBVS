const forge=require('node-forge');
const keys=forge.pki.rsa.generateKeyPair(2048);
const cert=forge.pki.createCertificate();
cert.publicKey=keys.publicKey;
cert.serialNumber=(Date.now()).toString(16);
cert.validity.notBefore=new Date();
cert.validity.notAfter=new Date(); cert.validity.notAfter.setDate(cert.validity.notBefore.getDate()+825);
const attrs=[{name:'commonName',value:'hbvs.local'}];
cert.setSubject(attrs); cert.setIssuer(attrs);
cert.setExtensions([{name:'basicConstraints',cA:true},{name:'subjectAltName',altNames:[
  {type:2,value:'hbvs.local'},
  {type:2,value:'localhost'},
  {type:7,ip:'192.168.51.32'},
  {type:7,ip:'192.168.135.32'},
  {type:7,ip:'192.168.51.156'},
  {type:7,ip:'127.0.0.1'}
]}]);
cert.sign(keys.privateKey,forge.md.sha256.create());
require('fs').writeFileSync('cert.pem',forge.pki.certificateToPem(cert));
require('fs').writeFileSync('key.pem',forge.pki.privateKeyToPem(keys.privateKey));
console.log('DONE: hbvs.local cert created');
