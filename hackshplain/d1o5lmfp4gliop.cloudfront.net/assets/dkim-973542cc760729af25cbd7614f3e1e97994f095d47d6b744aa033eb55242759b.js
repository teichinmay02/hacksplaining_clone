
/**
 * Sign an email with provided DKIM key, using RSA-SHA256.
 */
function generateDKIMSignature(headers, body, domainName, keySelector, passPhrase) {
  
  // All listed fields from RFC4871 #5.5
  var fieldNames = 'From:Sender:Reply-To:Subject:To:' +
    'Cc:MIME-Version:Content-Type:Content-Transfer-Encoding:Content-ID:' +
    'Content-Description:Resent-Date:Resent-From:Resent-Sender:' +
    'Resent-To:Resent-Cc:Resent-Message-ID:In-Reply-To:References:' +
    'List-Id:List-Help:List-Unsubscribe:List-Subscribe:List-Post:' +
    'List-Owner:List-Archive';
  
  var dkim = generateDKIMHeader(
                domainName,
                keySelector,
                fieldNames,
                headers, 
                body);
  
  var canonicalizedHeaderData = DKIMCanonicalizer.relaxedHeaders(headers, fieldNames);
  var canonicalizedDKIMHeader = DKIMCanonicalizer.relaxedHeaderLine(dkim);
  
  canonicalizedHeaderData.headers += canonicalizedDKIMHeader.key + ':' + canonicalizedDKIMHeader.value;
  
  var rsaKey    = cryptico.generateRSAKey(passPhrase, 1024);
  var publicKey = cryptico.publicKeyString(rsaKey);
  var signature = cryptico.encrypt(SHA256(canonicalizedHeaderData.headers), publicKey, rsaKey);
  
  return dkim + signature.cipher.replace(/(^.{73}|.{75}(?!\r?\n|\r))/g, '$&\r\n ').trim();
}

/**
 * Generates a DKIM-Signature header field.
 */
function generateDKIMHeader(domainName, keySelector, headerFieldNames, headers, body) {
  var canonicalizedBody       = DKIMCanonicalizer.relaxedBody(body);
  var canonicalizedBodyHash   = SHA256(canonicalizedBody, 'base64');
  var canonicalizedHeaderData = DKIMCanonicalizer.relaxedHeaders(headers, headerFieldNames);
  
  var dkim = [
    'v=1',
    'a=rsa-sha256',
    'c=relaxed/relaxed',
    'd=' + domainName,
    'q=dns/txt',
    's=' + keySelector,
    'bh=' + canonicalizedBodyHash,
    'h=' + canonicalizedHeaderData.fieldNames
  ].join('; ');
  
  return foldLines('DKIM-Signature: ' + dkim, 76) + ';\r\n b=';
}

/**
 * DKIM canonicalization functions.
 */
var DKIMCanonicalizer = {
  
  /**
   * Relaxed body canonicalization by rfc4871 #3.4.4
   *
   * @param {String} body E-mail body part
   * @return {String} Canonicalized body
   */
  relaxedBody: function(body) {
    return (body || '')
              .toString()
              .replace(/\r?\n|\r/g, '\n')
              .split('\n')
              .map(function(line) {
                return line.replace(/\s*$/, '').replace(/\s+/g, ' ');
              })
              .join('\n')
              .replace(/\n*$/, '\n')
              .replace(/\n/g, '\r\n');
  },
  
  /**
   * Relaxed headers canonicalization by rfc4871 #3.4.2 with filtering
   */
  relaxedHeaders: function(headers, fieldNames) {
    var includedFields = (fieldNames || '').toLowerCase().split(':').map(function(field) {
                            return field.trim();
                         });
    var headerFields = headers;
    var line, i;
    
    var headerLines = []
  
    for (var key in headers) {
      headerLines.push(key + ": " + headers[key])
    }
    
    for (i = headerLines.length - 1; i >= 0; i--) {
      if (i && headerLines[i].match(/^\s/)) {
        headerLines[i - 1] += headerLines.splice(i, 1);
      } else {
        line = DKIMCanonicalizer.relaxedHeaderLine(headerLines[i]);
        
        // on multiple values, include only the first one (the one in the bottom of the list)
        if (includedFields.indexOf(line.key) >= 0 && !(line.key in headerFields)) {
          headerFields[line.key] = line.value;
        }
      }
    }
    
    headers = [];
    for (i = includedFields.length - 1; i >= 0; i--) {
      if (!headerFields[includedFields[i]]) {
        includedFields.splice(i, 1);
      } else {
        headers.unshift(includedFields[i] + ':' + headerFields[includedFields[i]]);
      }
    }
    
    return {
      headers: headers.join('\r\n') + '\r\n',
      fieldNames: includedFields.join(':')
    };
  },
  
  /**
   * Relaxed header canonicalization for single header line
   */
  relaxedHeaderLine: function(line) {
    var value = line.split(':');
    var key = (value.shift() || '').toLowerCase().trim();
    
    value = value.join(':').replace(/\s+/g, ' ').trim();
    
    return {
      key: key,
      value: value
    };
  }
};

/**
 * Folds long lines, useful for folding header lines (afterSpace=false) and
 * flowed text (afterSpace=true)
 *
 * @param {String} str String to be folded
 * @param {Number} [lineLength=76] Maximum length of a line
 * @param {Boolean} afterSpace If true, leave a space in th end of a line
 * @return {String} String with folded lines
 */
function foldLines(str, lineLength, afterSpace) {
  str = (str || '').toString();
  lineLength = lineLength || 76;
  
  var pos = 0,
      len = str.length,
      result = '',
      line, match;
  
  while (pos < len) {
    line = str.substr(pos, lineLength);
    if (line.length < lineLength) {
      result += line;
      break;
    }
    
    if ((match = line.match(/^[^\n\r]*(\r?\n|\r)/))) {
      line = match[0];
      result += line;
      pos += line.length;
      continue;
    } else if ((match = line.match(/(\s+)[^\s]*$/)) && match[0].length - (afterSpace ? (match[1] || '').length : 0) < line.length) {
      line = line.substr(0, line.length - (match[0].length - (afterSpace ? (match[1] || '').length : 0)));
    } else if ((match = str.substr(pos + line.length).match(/^[^\s]+(\s*)/))) {
      line = line + match[0].substr(0, match[0].length - (!afterSpace ? (match[1] || '').length : 0));
    }
    
    result += line;
    pos += line.length;
    if (pos < len) {
      result += '\r\n';
    }
  }
  
  return result;
};
