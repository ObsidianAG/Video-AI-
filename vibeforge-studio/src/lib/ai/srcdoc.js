export function buildSrcDoc(code, nonce) {
    const bridge = `<script>(function(){
    var send=function(kind,args){parent.postMessage(
      {vf:"${nonce}",kind:kind,args:args.map(String)},"*");};
    ["log","warn","error"].forEach(function(k){var o=console[k];
      console[k]=function(){send(k,[].slice.call(arguments));o.apply(console,arguments);};});
    window.onerror=function(m,s,l,c){send("error",[m+" @"+l+":"+c]);};
  })();</script>`;
    return code.includes("</head>") ? code.replace("</head>", bridge + "</head>")
        : bridge + code;
}
