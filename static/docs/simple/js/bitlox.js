
(function($) {

// globals
	var scriptsToReplace = [];
	var BulkString;


//  	var serverURL = 'https://insight.bitpay.com/api';
// 	var serverURL = 'https://bitlox.io/api';
	var serverURL = '/api';
	

/////////////////////////////////////////////////
// functions from Brainwallet for message signing
/////////////////////////////////////////////////
    var POLL_INTERVAL = 200;

    var key = null;
    var network = null;
    var gen_from = 'pass';
    var gen_compressed = false;
    var gen_eckey = null;
    var gen_pt = null;
    var gen_ps_reset = false;
    var TIMEOUT = 600;
    var timeout = null;

    var PUBLIC_KEY_VERSION = 0;
    var PRIVATE_KEY_VERSION = 0x80;

    var TEST_PUBLIC_KEY_VERSION = 0x6f;
    var TEST_PRIVATE_KEY_VERSION = 0xef;

    var DOGE_PUBLIC_KEY_VERSION = 0x1e;
    var DOGE_PRIVATE_KEY_VERSION = 0x9e;

    var LTC_PUBLIC_KEY_VERSION = 0x30;
    var LTC_PRIVATE_KEY_VERSION = 0xb0;


    var sgData = null;
    var sgType = 'inputs_io';

    function setErrorState(field, err, msg) {
        var group = field.closest('.controls');
        if (err) {
            group.addClass('has-error');
            group.attr('title',msg);
        } else {
            group.removeClass('has-error');
            group.attr('title','');
        }
    }

    function sgOnChangeType() {
        var id = $(this).attr('name');
        if (sgType!=id)
        {
          sgType = id;
          if (sgData!=null)
            sgSign();
        }
    }

//     function updateAddr(from, to) {
//     function updateAddr(to) {
// //         var sec = from.val();
//         var addr = '';
//         var eckey = null;
//         var compressed = false;
//         try {
//             var res = parseBase58Check(sec); 
//             var version = res[0];
//             var payload = res[1];
//             if (payload.length > 32) {
//                 payload.pop();
//                 compressed = true;
//             }
//             eckey = new Bitcoin.ECKey(payload);
//             var curve = getSECCurveByName("secp256k1");
//             var pt = curve.getG().multiply(eckey.priv);
//             eckey.pub = getEncoded(pt, compressed);
//             eckey.pubKeyHash = Bitcoin.Util.sha256ripe160(eckey.pub);
//             addr = new Bitcoin.Address(eckey.getPubKeyHash());
//             addr.version = (version-128)&255;
//             setErrorState(from, false);
//         } catch (err) {
//             setErrorState(from, true, "Bad private key");
//         }
//         to.val(addr);
//         return {"key":eckey, "compressed":compressed, "addrtype":version, "address":addr};
//     }

//     function sgGenAddr() {
//         updateAddr($('#sgSec'), $('#sgAddr'));
//     }

    function sgOnChangeSec() {
        $('#sgSig').val('');
        sgData = null;
        clearTimeout(timeout);
        timeout = setTimeout(sgGenAddr, TIMEOUT);
    }

    function fullTrim(message)
    {
        console.log("in FullTrim");
        message = message.replace(/^\s+|\s+$/g, '');
        message = message.replace(/^\n+|\n+$/g, '');
        return message;
    }

    var sgHdr = [
      "-----BEGIN BITCOIN SIGNED MESSAGE-----",
      "-----BEGIN SIGNATURE-----",
      "-----END BITCOIN SIGNED MESSAGE-----"
    ];

    var qtHdr = [
      "-----BEGIN BITCOIN SIGNED MESSAGE-----",
      "-----BEGIN BITCOIN SIGNATURE-----",
      "-----END BITCOIN SIGNATURE-----"
    ];

    function makeSignedMessage(type, msg, addr, sig)
    {
      if (type=='inputs_io')
        return sgHdr[0]+'\n'+msg +'\n'+sgHdr[1]+'\n'+addr+'\n'+sig+'\n'+sgHdr[2];
      else if (type=='armory')
        return sig;
      else
        return qtHdr[0]+'\n'+msg +'\n'+qtHdr[1]+'\nVersion: Bitcoin-qt (1.0)\nAddress: '+addr+'\n\n'+sig+'\n'+qtHdr[2];
    }

    function sgSign() {
      var message = $('#sgMsg').val();
      var p = updateAddr($('#sgSec'), $('#sgAddr'));

      if ( !message || !p.address )
        return;

      message = fullTrim(message);

      if (sgType=='armory') {
        var sig = armory_sign_message (p.key, p.address, message, p.compressed, p.addrtype);
      } else {
        var sig = sign_message(p.key, message, p.compressed, p.addrtype);
      }

      sgData = {"message":message, "address":p.address, "signature":sig};

      $('#sgSig').val(makeSignedMessage(sgType, sgData.message, sgData.address, sgData.signature));
    }

    function sgOnChangeMsg() {
        $('#sgSig').val('');
        sgData = null;
        clearTimeout(timeout);
        timeout = setTimeout(sgUpdateMsg, TIMEOUT);
    }

    function sgUpdateMsg() {
        $('#vrMsg').val($('#sgMsg').val());
    }

    // -- verify --
    function vrOnChangeSig() {
        //$('#vrAlert').empty();
        window.location.hash='#verify';
    }

    function vrPermalink()
    {
      var msg = $('#vrMsg').val();
      var sig = $('#vrSig').val();
      var addr = $('#vrAddr').val();
      return '?vrMsg='+encodeURIComponent(msg)+'&vrSig='+encodeURIComponent(sig)+'&vrAddr='+encodeURIComponent(addr);
    }

    function splitSignature(s)
    {
      var addr = '';
      var sig = s;
      if ( s.indexOf('\n')>=0 )
      {
        var a = s.split('\n');
        addr = a[0];

        // always the last
        sig = a[a.length-1];

        // try named fields
//         Since we are not going to be doing Armory or bt-qt style sigs, we don't need this
//         var h1 = 'Address: ';
//         for (i in a) {
//           var m = a[i];
//           if ( m.indexOf(h1)>=0 )
//             addr = m.substring(h1.length, m.length);
//         }

        // address should not contain spaces
        if (addr.indexOf(' ')>=0)
          addr = '';

        // some forums break signatures with spaces
        sig = sig.replace(" ","");
      }
      console.log("in splitSignature address = " + addr);
      console.log("in splitSignature signature = " + sig);
      return { "address":addr, "signature":sig };
    }

    function splitSignedMessage(s)
    {
      s = s.replace('\r','');

      for (var i=0; i<2; i++ )
      {
        var hdr = i==0 ? sgHdr : qtHdr;

        var p0 = s.indexOf(hdr[0]);
        if ( p0>=0 )
        {
          var p1 = s.indexOf(hdr[1]);
          if ( p1>p0 )
          {
            var p2 = s.indexOf(hdr[2]);
            if ( p2>p1 )
            {
              var msg = s.substring(p0+hdr[0].length+1, p1-1);
              console.log("in splitSignedMessage msg = " + msg);
              var sig = s.substring(p1+hdr[1].length+1, p2-1);
              console.log("in splitSignedMessage sig = " + sig);
              var m = splitSignature(sig);
              msg = fullTrim(msg); // doesn't work without this
              return { "message":msg, "address":m.address, "signature":m.signature };
            }
          }
        }
      }
      return false;
    }

    function vrVerify() {
    console.log("in vrVerify");
        var s = $('#vrSig').val();
    console.log("s: \n" + s);
        var p = splitSignedMessage(s);
        var res = verify_message(p.signature, p.message, PUBLIC_KEY_VERSION);

        if (!res) {
          var values = armory_split_message(s);
          res = armory_verify_message(values);
          p = {"address":values.Address};
        }

        $('#vrAlert').empty();

        var clone = $('#vrError').clone();

        if ( p && res && (p.address==res || p.address==''))
        {
          clone = p.address==res ? $('#vrSuccess').clone() : $('#vrWarning').clone();
          clone.find('#vrAddr').text(res);
        }

        clone.appendTo($('#vrAlert'));

        return false;
    }
    
    
    
    
    function txOnAddDest() {
        var list = $(document).find('.txCC');
        var clone = list.last().clone();
        clone.find('.help-inline').empty();
        clone.find('.control-label').text('Cc');
        var dest = clone.find('#txDest');
        var value = clone.find('#txValue');
        clone.insertAfter(list.last());
        onInput(dest, txOnChangeDest);
        onInput(value, txOnChangeDest);
        dest.val('');
        value.val('');
        $('#txRemoveDest').attr('disabled', false);
        return false;
    }

    function txOnRemoveDest() {
        var list = $(document).find('.txCC');
        if (list.size() == 2)
            $('#txRemoveDest').attr('disabled', true);
        list.last().remove();
        return false;
    }

    function txOnChangeDest() {
        var balance = parseFloat($('#txBalance').val());
        var fval = parseFloat('0'+$('#txValue').val());
        var fee = parseFloat('0'+$('#txFee').val());

        if (fval + fee > balance) {
            fee = balance - fval;
            $('#txFee').val(fee > 0 ? fee : '0.00');
        }

        clearTimeout(timeout);
        timeout = setTimeout(txRebuild, TIMEOUT);
    }

    
    
    
/////////////////////////////////////////////////
/////////////////////////////////////////////////
// functions from Brainwallet for message signing
/////////////////////////////////////////////////
// END
/////////////////////////////////////////////////




    ///////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////
    // BITLOX SPECIFIC
    ///////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////

    ///////////////////////////////////////////////////////////////////////////////////////
    // PROTOBUF ENCODED MESSAGES
    ///////////////////////////////////////////////////////////////////////////////////////

    function initialize_protobuf_encode() {
        var ProtoBuf = dcodeIO.ProtoBuf;
        var ByteBuffer = dcodeIO.ByteBuffer;
        var builder = ProtoBuf.loadProtoFile("js/messages.proto"),
            Device = builder.build();

//         var tempBuffer = ByteBuffer.allocate(1024);

		var randomnumber= d2h(Math.floor(Math.random()*1000000001));
        console.log("randomnumber: " + randomnumber);

//         var bb = new ByteBuffer();
//             bb.writeUint8(0x31);
//             bb.writeUint8(0x32);
// 			bb.flip();


		var bb = new ByteBuffer();
        var parseLength = randomnumber.length
// 	console.log("utx length = " + parseLength);
        var i;
        for (i = 0; i < parseLength; i += 2) {
            var value = randomnumber.substring(i, i + 2);
// 	console.log("value = " + value);		
            var prefix = "0x";
            var together = prefix.concat(value);
// 	console.log("together = " + together);
            var result = parseInt(together);
// 	console.log("result = " + result);

            bb.writeUint8(result);
        }
        bb.flip();
			
        var initializeContents = new Device.Initialize({
            "session_id": bb,
        });

        tempBuffer = initializeContents.encode();
        var tempTXstring = tempBuffer.toString('hex');
//         document.getElementById("temp_results").innerHTML = tempTXstring;
        txSize = d2h((tempTXstring.length) / 2).toString('hex');
        // 	console.log("txSize = " + txSize);
        // 	console.log("txSize.length = " + txSize.length);
        var j;
        var txLengthOriginal = txSize.length;
        for (j = 0; j < (8 - txLengthOriginal); j++) {
            var prefix = "0";
            txSize = prefix.concat(txSize);
        }
        // 	console.log("txSizePadded = " + txSize);
        tempTXstring = txSize.concat(tempTXstring);

        var command = "0017"; 
        tempTXstring = command.concat(tempTXstring);

        var magic = "2323"
        tempTXstring = magic.concat(tempTXstring);
        console.log("init: " + tempTXstring);
		autoCannedTransaction(tempTXstring);


    }

	function directLoadWallet(walletToLoad) {
        var ProtoBuf = dcodeIO.ProtoBuf;
        var ByteBuffer = dcodeIO.ByteBuffer;
        var builder = ProtoBuf.loadProtoFile("js/messages.proto"),
            Device = builder.build();
	
		var walletToLoadNumber = Number(walletToLoad);
        var loadWalletMessage = new Device.LoadWallet({
			"wallet_number": walletToLoadNumber
        });    
        tempBuffer = loadWalletMessage.encode();
        var tempTXstring = tempBuffer.toString('hex');
        document.getElementById("temp_results").innerHTML = tempTXstring;
        txSize = d2h((tempTXstring.length) / 2).toString('hex');
	console.log("tempTXstring = " + tempTXstring);
// 	console.log("txSize.length = " + txSize.length);
        var j;
        var txLengthOriginal = txSize.length;
        for (j = 0; j < (8 - txLengthOriginal); j++) {
            var prefix = "0";
            txSize = prefix.concat(txSize);
        }
// 	console.log("txSizePadded = " + txSize);
        tempTXstring = txSize.concat(tempTXstring);

        var command = "000B"; 
        tempTXstring = command.concat(tempTXstring);

        var magic = "2323"
        tempTXstring = magic.concat(tempTXstring);
        console.log("tempTXstring = " + tempTXstring);

        autoCannedTransaction(tempTXstring);
	}


	function getEntropy(entropy_amount) {
        var ProtoBuf = dcodeIO.ProtoBuf;
        var ByteBuffer = dcodeIO.ByteBuffer;
        var builder = ProtoBuf.loadProtoFile("js/messages.proto"),
            Device = builder.build();
	
		var entropyToGet = Number(entropy_amount);
        var getEntropyMessage = new Device.GetEntropy({
			"number_of_bytes": entropyToGet
        });    
        tempBuffer = getEntropyMessage.encode();
        var tempTXstring = tempBuffer.toString('hex');
        document.getElementById("temp_results").innerHTML = tempTXstring;
        txSize = d2h((tempTXstring.length) / 2).toString('hex');
	console.log("tempTXstring = " + tempTXstring);
// 	console.log("txSize.length = " + txSize.length);
        var j;
        var txLengthOriginal = txSize.length;
        for (j = 0; j < (8 - txLengthOriginal); j++) {
            var prefix = "0";
            txSize = prefix.concat(txSize);
        }
// 	console.log("txSizePadded = " + txSize);
        tempTXstring = txSize.concat(tempTXstring);

        var command = "0014"; 
        tempTXstring = command.concat(tempTXstring);

        var magic = "2323"
        tempTXstring = magic.concat(tempTXstring);
        console.log("tempTXstring = " + tempTXstring);

        autoCannedTransaction(tempTXstring);
	}


    function constructOTP() {
        var ProtoBuf = dcodeIO.ProtoBuf;
        var ByteBuffer = dcodeIO.ByteBuffer;
        var builder = ProtoBuf.loadProtoFile("js/messages.proto"),
            Device = builder.build();

        var otpCommandValue = document.getElementById('otp_input').value;
        
        var otpMessage = new Device.OtpAck({
			"otp": otpCommandValue
        });    

	
        tempBuffer = otpMessage.encode();
        var tempTXstring = tempBuffer.toString('hex');
        document.getElementById("temp_results").innerHTML = tempTXstring;
        txSize = d2h((tempTXstring.length) / 2).toString('hex');
	console.log("tempTXstring = " + tempTXstring);
// 	console.log("txSize.length = " + txSize.length);
        var j;
        var txLengthOriginal = txSize.length;
        for (j = 0; j < (8 - txLengthOriginal); j++) {
            var prefix = "0";
            txSize = prefix.concat(txSize);
        }
// 	console.log("txSizePadded = " + txSize);
        tempTXstring = txSize.concat(tempTXstring);

        var command = "0057"; 
        tempTXstring = command.concat(tempTXstring);

        var magic = "2323"
        tempTXstring = magic.concat(tempTXstring);
        console.log("tempTXstring = " + tempTXstring);
        return tempTXstring;
    }



	function constructPIN() {
        var ProtoBuf = dcodeIO.ProtoBuf;
        var ByteBuffer = dcodeIO.ByteBuffer;
        var builder = ProtoBuf.loadProtoFile("js/messages.proto"),
            Device = builder.build();
		var pin = Crypto.util.bytesToHex(Crypto.charenc.UTF8.stringToBytes(document.getElementById('pin_input').value));
		
		var bbPIN = new ByteBuffer();
        var parseLength = pin.length
// 	console.log("utx length = " + parseLength);
        var i;
        for (i = 0; i < parseLength; i += 2) {
            var value = pin.substring(i, i + 2);
// 	console.log("value = " + value);		
            var prefix = "0x";
            var together = prefix.concat(value);
// 	console.log("together = " + together);
            var result = parseInt(together);
// 	console.log("result = " + result);

            bbPIN.writeUint8(result);
        }
        bbPIN.flip();
        
        var pinAckMessage = new Device.PinAck({
			"password": bbPIN
        });    

	
        tempBuffer = pinAckMessage.encode();
        var tempTXstring = tempBuffer.toString('hex');
        document.getElementById("temp_results").innerHTML = tempTXstring;
        txSize = d2h((tempTXstring.length) / 2).toString('hex');
	console.log("tempTXstring = " + tempTXstring);
// 	console.log("txSize.length = " + txSize.length);
        var j;
        var txLengthOriginal = txSize.length;
        for (j = 0; j < (8 - txLengthOriginal); j++) {
            var prefix = "0";
            txSize = prefix.concat(txSize);
        }
// 	console.log("txSizePadded = " + txSize);
        tempTXstring = txSize.concat(tempTXstring);

        var command = "0054"; 
        tempTXstring = command.concat(tempTXstring);

        var magic = "2323"
        tempTXstring = magic.concat(tempTXstring);
        console.log("tempTXstring = " + tempTXstring);

        autoCannedTransaction(tempTXstring);
	
	}


	function constructPing() {
        var ProtoBuf = dcodeIO.ProtoBuf;
        var ByteBuffer = dcodeIO.ByteBuffer;
        var builder = ProtoBuf.loadProtoFile("js/messages.proto"),
            Device = builder.build();
		var pin = Crypto.util.bytesToHex(Crypto.charenc.UTF8.stringToBytes(document.getElementById('ping_input').value));
		
// 		var bbPIN = new ByteBuffer();
//         var parseLength = pin.length
// // 	console.log("utx length = " + parseLength);
//         var i;
//         for (i = 0; i < parseLength; i += 2) {
//             var value = pin.substring(i, i + 2);
// // 	console.log("value = " + value);		
//             var prefix = "0x";
//             var together = prefix.concat(value);
// // 	console.log("together = " + together);
//             var result = parseInt(together);
// // 	console.log("result = " + result);
// 
//             bbPIN.writeUint8(result);
//         }
//         bbPIN.flip();
        
        var pinAckMessage = new Device.Ping({
			"greeting": document.getElementById('ping_input').value
        });    

	
        tempBuffer = pinAckMessage.encode();
        var tempTXstring = tempBuffer.toString('hex');
        document.getElementById("temp_results").innerHTML = tempTXstring;
        txSize = d2h((tempTXstring.length) / 2).toString('hex');
	console.log("tempTXstringPayload = " + tempTXstring);
// 	console.log("txSize.length = " + txSize.length);
        var j;
        var txLengthOriginal = txSize.length;
        for (j = 0; j < (8 - txLengthOriginal); j++) {
            var prefix = "0";
            txSize = prefix.concat(txSize);
        }
// 	console.log("txSizePadded = " + txSize);
        tempTXstring = txSize.concat(tempTXstring);

        var command = "0000"; 
        tempTXstring = command.concat(tempTXstring);

        var magic = "2323"
        tempTXstring = magic.concat(tempTXstring);
        console.log("tempTXstring = " + tempTXstring);

        autoCannedTransaction(tempTXstring);
	
	}
	
	
	function putAll() {
	        console.log("In putAll"); 
        var ProtoBuf = dcodeIO.ProtoBuf;
        var ByteBuffer = dcodeIO.ByteBuffer;
        var builder = ProtoBuf.loadProtoFile("js/messages.proto"),
            Device = builder.build();
// 		var pin = Crypto.util.bytesToHex(Crypto.charenc.UTF8.stringToBytes(document.getElementById('ping_input').value));
		
		var bbBulk = new ByteBuffer();
        var parseLength = BulkString.length
// 	console.log("utx length = " + parseLength);
        var i;
        for (i = 0; i < parseLength; i += 2) {
            var value = BulkString.substring(i, i + 2);
// 	console.log("value = " + value);		
            var prefix = "0x";
            var together = prefix.concat(value);
// 	console.log("together = " + together);
            var result = parseInt(together);
// 	console.log("result = " + result);

            bbBulk.writeUint8(result);
        }
        bbBulk.flip();
        
        var BulkMessage = new Device.SetBulk({
			"bulk": bbBulk
        });    

	
        tempBuffer = BulkMessage.encode();
        var tempTXstring = tempBuffer.toString('hex');
        document.getElementById("temp_results").innerHTML = tempTXstring;
        txSize = d2h((tempTXstring.length) / 2).toString('hex');
// 	console.log("tempTXstring = " + tempTXstring);
	console.log("txSize = " + txSize);
        var j;
        var txLengthOriginal = txSize.length;
        for (j = 0; j < (8 - txLengthOriginal); j++) {
            var prefix = "0";
            txSize = prefix.concat(txSize);
        }
// 	console.log("txSizePadded = " + txSize);
        tempTXstring = txSize.concat(tempTXstring);

        var command = "0083"; 
        tempTXstring = command.concat(tempTXstring);

        var magic = "2323"
        tempTXstring = magic.concat(tempTXstring);
        console.log("BulktempTXstring = " + tempTXstring);

        autoCannedTransaction(tempTXstring);
	
	}



////////////////////////////
// Restore wallet
// document.getElementById('restore_wallet_input').value
// Responses: Success or Failure
// Response interjections: ButtonRequest
// wallet_name is stored purely for the convenience of the host. It should be
// a null-terminated UTF-8 encoded string with a maximum length of 40 bytes.
// To create an unencrypted wallet, exclude password.
// message NewWallet
// {
// 	optional uint32 wallet_number = 1 ;//[default = 0];
// 	optional bytes password = 2;
// 	optional bytes wallet_name = 3;
// 	optional bool is_hidden = 4 ;//[default = false];
// }
// Responses: Success or Failure
// Response interjections: ButtonRequest
// message RestoreWallet
// {
// 	required NewWallet new_wallet = 1;
// 	required bytes seed = 2;
// }
// 
// 
////////////////////////////

    function constructNewWalletRestore() {
        var ProtoBuf = dcodeIO.ProtoBuf;
        var ByteBuffer = dcodeIO.ByteBuffer;
        var builder = ProtoBuf.loadProtoFile("js/messages.proto"),
            Device = builder.build();
        
// WALLET NUMBER
// 		var walletNumber = Number(document.getElementById('new_wallet_number').value);
		var walletNumber = 49;
		
// PASSWORD *DEPRECATED* Value in this field merely toggles the on-device password routine
		var passwordString = document.getElementById('new_wallet_password').value;
		if (passwordString != ''){
			var password = Crypto.util.bytesToHex(Crypto.charenc.UTF8.stringToBytes(passwordString));
			console.log("pass: " + password);    
			var bbPass = new ByteBuffer();
			var parseLength = password.length
	// 	console.log("utx length = " + parseLength);
			var i;
			for (i = 0; i < parseLength; i += 2) {
				var value = password.substring(i, i + 2);
	// 	console.log("value = " + value);		
				var prefix = "0x";
				var together = prefix.concat(value);
	// 	console.log("together = " + together);
				var result = parseInt(together);
	// 	console.log("result = " + result);

				bbPass.writeUint8(result);
			}
			bbPass.flip();
		}else{
			var bbPass = null;
		}
		
// NAME
        var nameToUse = document.getElementById('new_wallet_name').value;
        console.log("name: " + nameToUse);    
            
        var nameToUseHexed = toHexPadded40bytes(nameToUse);    
        console.log("namehexed: " + nameToUseHexed);    
        
		var bbName = new ByteBuffer();
        var parseLength = nameToUseHexed.length
// 	console.log("utx length = " + parseLength);
        var i;
        for (i = 0; i < parseLength; i += 2) {
            var value = nameToUseHexed.substring(i, i + 2);
// 	console.log("value = " + value);		
            var prefix = "0x";
            var together = prefix.concat(value);
// 	console.log("together = " + together);
            var result = parseInt(together);
// 	console.log("result = " + result);

            bbName.writeUint8(result);
        }
        bbName.flip();
// end NAME        
        
        
// HIDDEN
		var is_hidden = document.getElementById("new_wallet_isHidden").checked;

        
        var newWalletMessage = new Device.NewWallet({
        	"wallet_number": walletNumber
        	,
        	"password": bbPass
        	,
        	"wallet_name": bbName
        	,
        	"is_hidden": is_hidden
        });    

		var restoreSeed = document.getElementById('restore_wallet_input').value;

		var sizeOfSeed =  restoreSeed.length;
        console.log("sizeOfSeed = " + sizeOfSeed);

        var bb = ByteBuffer.allocate((sizeOfSeed/2)+64);

        var i;
        for (i = 0; i < sizeOfSeed; i += 2) {
            var value = restoreSeed.substring(i, i + 2);
            // 		console.log("value = " + value);		
            var prefix = "0x";
            var together = prefix.concat(value);
            // 		console.log("together = " + together);
            var result = parseInt(together);
            // 		console.log("result = " + result);

            bb.writeUint8(result);
        }
        bb.flip();


		var restoreWalletMessage = new Device.RestoreWallet({
			"new_wallet" : newWalletMessage
			,
			"seed" : bb
		});            
        tempBuffer = newWalletMessage.encode();
        var tempTXstring = tempBuffer.toString('hex');
        document.getElementById("temp_results").innerHTML = tempTXstring;
        txSize = d2h((tempTXstring.length) / 2).toString('hex');
	console.log("tempTXstring = " + tempTXstring);
// 	console.log("txSize.length = " + txSize.length);
        var j;
        var txLengthOriginal = txSize.length;
        for (j = 0; j < (8 - txLengthOriginal); j++) {
            var prefix = "0";
            txSize = prefix.concat(txSize);
        }
// 	console.log("txSizePadded = " + txSize);
        tempTXstring = txSize.concat(tempTXstring);

        var command = "0012"; 
        tempTXstring = command.concat(tempTXstring);

        var magic = "2323"
        tempTXstring = magic.concat(tempTXstring);
        console.log("tempTXstring = " + tempTXstring);

        autoCannedTransaction(tempTXstring);

//         return renameCommand;
    }
    
    
////////////////////////////
// New wallet
// 
// Responses: Success or Failure
// Response interjections: ButtonRequest
// wallet_name is stored purely for the convenience of the host. It should be
// a null-terminated UTF-8 encoded string with a maximum length of 40 bytes.
// To create an unencrypted wallet, exclude password.
// message NewWallet
// {
// 	optional uint32 wallet_number = 1 ;//[default = 0];
// 	optional bytes password = 2;
// 	optional bytes wallet_name = 3;
// 	optional bool is_hidden = 4 ;//[default = false];
// }
////////////////////////////

    function constructNewWallet() {
        var ProtoBuf = dcodeIO.ProtoBuf;
        var ByteBuffer = dcodeIO.ByteBuffer;
        var builder = ProtoBuf.loadProtoFile("js/messages.proto"),
            Device = builder.build();
        
// WALLET NUMBER
// 		var walletNumber = Number(document.getElementById('new_wallet_number').value);
		var walletNumber = 49;
		
// PASSWORD *DEPRECATED* Value in this field merely toggles the on-device password routine
		var passwordString = document.getElementById('new_wallet_password').value;
		if (passwordString != ''){
			var password = Crypto.util.bytesToHex(Crypto.charenc.UTF8.stringToBytes(passwordString));
			console.log("pass: " + password);    
			var bbPass = new ByteBuffer();
			var parseLength = password.length
	// 	console.log("utx length = " + parseLength);
			var i;
			for (i = 0; i < parseLength; i += 2) {
				var value = password.substring(i, i + 2);
	// 	console.log("value = " + value);		
				var prefix = "0x";
				var together = prefix.concat(value);
	// 	console.log("together = " + together);
				var result = parseInt(together);
	// 	console.log("result = " + result);

				bbPass.writeUint8(result);
			}
			bbPass.flip();
		}else{
			var bbPass = null;
		}
		
// NAME
        var nameToUse = document.getElementById('new_wallet_name').value;
        console.log("name: " + nameToUse);    
            
        var nameToUseHexed = toHexPadded40bytes(nameToUse);    
        console.log("namehexed: " + nameToUseHexed);    
        
		var bbName = new ByteBuffer();
        var parseLength = nameToUseHexed.length
// 	console.log("utx length = " + parseLength);
        var i;
        for (i = 0; i < parseLength; i += 2) {
            var value = nameToUseHexed.substring(i, i + 2);
// 	console.log("value = " + value);		
            var prefix = "0x";
            var together = prefix.concat(value);
// 	console.log("together = " + together);
            var result = parseInt(together);
// 	console.log("result = " + result);

            bbName.writeUint8(result);
        }
        bbName.flip();
// end NAME        
        
        
// HIDDEN
// 		var is_hidden = document.getElementById("new_wallet_isHidden").checked;
		var is_hidden = false;

        
        var newWalletMessage = new Device.NewWallet({
        	"wallet_number": walletNumber
        	,
        	"password": bbPass
        	,
        	"wallet_name": bbName
        	,
        	"is_hidden": is_hidden
        });    
            
        tempBuffer = newWalletMessage.encode();
        var tempTXstring = tempBuffer.toString('hex');
        document.getElementById("temp_results").innerHTML = tempTXstring;
        txSize = d2h((tempTXstring.length) / 2).toString('hex');
	console.log("tempTXstring = " + tempTXstring);
// 	console.log("txSize.length = " + txSize.length);
        var j;
        var txLengthOriginal = txSize.length;
        for (j = 0; j < (8 - txLengthOriginal); j++) {
            var prefix = "0";
            txSize = prefix.concat(txSize);
        }
// 	console.log("txSizePadded = " + txSize);
        tempTXstring = txSize.concat(tempTXstring);

        var command = "0004"; 
        tempTXstring = command.concat(tempTXstring);

        var magic = "2323"
        tempTXstring = magic.concat(tempTXstring);
        console.log("tempTXstring = " + tempTXstring);

        autoCannedTransaction(tempTXstring);

//         return renameCommand;
    }

////////////////////////////
// Device Restore wallet
// 
// Responses: Success or Failure
// Response interjections: ButtonRequest
// wallet_name is stored purely for the convenience of the host. It should be
// a null-terminated UTF-8 encoded string with a maximum length of 40 bytes.
// To create an unencrypted wallet, exclude password.
// 
// Uses NewWallet message type
// message NewWallet
// {
// 	optional uint32 wallet_number = 1 ;//[default = 0];
// 	optional bytes password = 2;
// 	optional bytes wallet_name = 3;
// 	optional bool is_hidden = 4 ;//[default = false];
// }
////////////////////////////

    function constructDeviceRestoreWallet() {
        var ProtoBuf = dcodeIO.ProtoBuf;
        var ByteBuffer = dcodeIO.ByteBuffer;
        var builder = ProtoBuf.loadProtoFile("js/messages.proto"),
            Device = builder.build();
        
// WALLET NUMBER
		var walletNumber = Number(document.getElementById('device_restore_wallet_number').value);
		
// PASSWORD *DEPRECATED* Value in this field merely toggles the on-device password routine
		var passwordString = document.getElementById('device_restore_wallet_password').value;
		if (passwordString != ''){
			var password = Crypto.util.bytesToHex(Crypto.charenc.UTF8.stringToBytes(passwordString));
			console.log("pass: " + password);    
			var bbPass = new ByteBuffer();
			var parseLength = password.length
	// 	console.log("utx length = " + parseLength);
			var i;
			for (i = 0; i < parseLength; i += 2) {
				var value = password.substring(i, i + 2);
	// 	console.log("value = " + value);		
				var prefix = "0x";
				var together = prefix.concat(value);
	// 	console.log("together = " + together);
				var result = parseInt(together);
	// 	console.log("result = " + result);

				bbPass.writeUint8(result);
			}
			bbPass.flip();
		}else{
			var bbPass = null;
		}
		
// NAME
        var nameToUse = document.getElementById('device_restore_wallet_name').value;
        console.log("name: " + nameToUse);    
            
        var nameToUseHexed = toHexPadded40bytes(nameToUse);    
        console.log("namehexed: " + nameToUseHexed);    
        
		var bbName = new ByteBuffer();
        var parseLength = nameToUseHexed.length
// 	console.log("utx length = " + parseLength);
        var i;
        for (i = 0; i < parseLength; i += 2) {
            var value = nameToUseHexed.substring(i, i + 2);
// 	console.log("value = " + value);		
            var prefix = "0x";
            var together = prefix.concat(value);
// 	console.log("together = " + together);
            var result = parseInt(together);
// 	console.log("result = " + result);

            bbName.writeUint8(result);
        }
        bbName.flip();
// end NAME        
        
        
// HIDDEN
		var is_hidden = document.getElementById("device_restore_wallet_isHidden").checked;

        
        var newWalletMessage = new Device.NewWallet({
        	"wallet_number": walletNumber
        	,
        	"password": bbPass
        	,
        	"wallet_name": bbName
        	,
        	"is_hidden": is_hidden
        });    
            
        tempBuffer = newWalletMessage.encode();
        var tempTXstring = tempBuffer.toString('hex');
        document.getElementById("temp_results").innerHTML = tempTXstring;
        txSize = d2h((tempTXstring.length) / 2).toString('hex');
	console.log("tempTXstring = " + tempTXstring);
// 	console.log("txSize.length = " + txSize.length);
        var j;
        var txLengthOriginal = txSize.length;
        for (j = 0; j < (8 - txLengthOriginal); j++) {
            var prefix = "0";
            txSize = prefix.concat(txSize);
        }
// 	console.log("txSizePadded = " + txSize);
        tempTXstring = txSize.concat(tempTXstring);

        var command = "0018"; 
        tempTXstring = command.concat(tempTXstring);

        var magic = "2323"
        tempTXstring = magic.concat(tempTXstring);
        console.log("tempTXstring = " + tempTXstring);

        autoCannedTransaction(tempTXstring);

//         return renameCommand;
    }


////////////////////////////
// Rename loaded wallet
////////////////////////////

    function constructRenameWallet() {
        var ProtoBuf = dcodeIO.ProtoBuf;
        var ByteBuffer = dcodeIO.ByteBuffer;
        var builder = ProtoBuf.loadProtoFile("js/messages.proto"),
            Device = builder.build();
        
        var nameToUse = document.getElementById('rename_wallet_input').value;
        console.log("name: " + nameToUse);    
            
        var nameToUseHexed = toHexPadded40bytes(nameToUse);    
        console.log("namehexed: " + nameToUseHexed);    
        
		var bb = new ByteBuffer();
        var parseLength = nameToUseHexed.length
// 	console.log("utx length = " + parseLength);
        var i;
        for (i = 0; i < parseLength; i += 2) {
            var value = nameToUseHexed.substring(i, i + 2);
// 	console.log("value = " + value);		
            var prefix = "0x";
            var together = prefix.concat(value);
// 	console.log("together = " + together);
            var result = parseInt(together);
// 	console.log("result = " + result);

            bb.writeUint8(result);
        }
        bb.flip();
        
        
        
        var walletrenameContents = new Device.ChangeWalletName({
        	"wallet_name": bb
        });    
            
        tempBuffer = walletrenameContents.encode();
        var tempTXstring = tempBuffer.toString('hex');
        document.getElementById("temp_results").innerHTML = tempTXstring;
        txSize = d2h((tempTXstring.length) / 2).toString('hex');
	console.log("tempTXstring = " + tempTXstring);
// 	console.log("txSize.length = " + txSize.length);
        var j;
        var txLengthOriginal = txSize.length;
        for (j = 0; j < (8 - txLengthOriginal); j++) {
            var prefix = "0";
            txSize = prefix.concat(txSize);
        }
// 	console.log("txSizePadded = " + txSize);
        tempTXstring = txSize.concat(tempTXstring);

        var command = "000F"; 
        tempTXstring = command.concat(tempTXstring);

        var magic = "2323"
        tempTXstring = magic.concat(tempTXstring);
        console.log("tempTXstring = " + tempTXstring);

        autoCannedTransaction(tempTXstring);

//         return renameCommand;
    }


////////////////////////////
// Sign Message with address
////////////////////////////

	function signMessageWithDevice() {
		console.log("in signMessageWithDevice ########@@@@@@@@@@@@@@");
        var ProtoBuf = dcodeIO.ProtoBuf;
        var ByteBuffer = dcodeIO.ByteBuffer;
        var builder = ProtoBuf.loadProtoFile("js/messages.proto"),
            Device = builder.build();


	   	var message_string = document.getElementById("sgMsg").value;
	    message_string = fullTrim(message_string);
	    document.getElementById("sgMsgHidden").value = message_string;

		var message_concat_bytes = msg_bytes("Bitcoin Signed Message:\n").concat(msg_bytes(message_string));
		console.log("2b hashed msg bytes: " + message_concat_bytes);

		var message_concat_hex = Crypto.util.bytesToHex(message_concat_bytes);
		console.log("2b hashed msg hex: " +  message_concat_hex);


		
		address_handle_root = Number(document.getElementById("sgRoot").value);
		address_handle_chain = Number(document.getElementById("sgChain").value);
		address_handle_index = Number(document.getElementById("sgIndex").value);

console.log("address_handle_root " + address_handle_root);
console.log("address_handle_chain " + address_handle_chain);
console.log("address_handle_index " + address_handle_index);
		
		var bb = new ByteBuffer();
        var parseLength = message_concat_hex.length
// 	console.log("utx length = " + parseLength);
        var i;
        for (i = 0; i < parseLength; i += 2) {
            var value = message_concat_hex.substring(i, i + 2);
// 	console.log("value = " + value);		
            var prefix = "0x";
            var together = prefix.concat(value);
// 	console.log("together = " + together);
            var result = parseInt(together);
// 	console.log("result = " + result);

            bb.writeUint8(result);
        }
        bb.flip();

		var txContents = new Device.SignMessage({
		"address_handle_extended": 
				{
					"address_handle_root": address_handle_root, 
					"address_handle_chain": address_handle_chain, 
					"address_handle_index": address_handle_index
				},
		"message_data": bb
// 		,
// 		"message_data": message_string
		});
        tempBuffer = txContents.encode();
        var tempTXstring = tempBuffer.toString('hex');
        document.getElementById("temp_results").innerHTML = tempTXstring;
        txSize = d2h((tempTXstring.length) / 2).toString('hex');
// 	console.log("txSize = " + txSize);
// 	console.log("txSize.length = " + txSize.length);
        var j;
        var txLengthOriginal = txSize.length;
        for (j = 0; j < (8 - txLengthOriginal); j++) {
            var prefix = "0";
            txSize = prefix.concat(txSize);
        }
// 	console.log("txSizePadded = " + txSize);
        tempTXstring = txSize.concat(tempTXstring);

        var command = "0070"; 
        tempTXstring = command.concat(tempTXstring);

        var magic = "2323"
        tempTXstring = magic.concat(tempTXstring);
        console.log("tempTXstring = " + tempTXstring);

        autoCannedTransaction(tempTXstring);
		
	}


	
////////////////////////////
// Sign Transaction Prep
////////////////////////////

    var prepForSigning = function(unsignedtx, originatingTransactionArray, originatingTransactionArrayIndices, address_handle_chain, address_handle_index) {
        var ProtoBuf = dcodeIO.ProtoBuf;
        var ByteBuffer = dcodeIO.ByteBuffer;
        var builder = ProtoBuf.loadProtoFile("js/messages.proto"),
            Device = builder.build();
		var numberOfInputsinArray = originatingTransactionArray.length;
        console.log("numberOfInputsinArray: " + numberOfInputsinArray);
            
		var m;
		for(m = 0; m < numberOfInputsinArray; m++)
        {    
	        console.log("Originating Transaction "+m+": " + originatingTransactionArray[m]);
		}

        
        
		var address_handle_root = [];
		for(m = 0; m < numberOfInputsinArray; m++)
		{
			address_handle_root[m] = 0;
		}
		
		var address_handle_extended_data = []; // empty array
		var k;
		for (k=0;k<numberOfInputsinArray;k++)
		{
			address_handle_extended_data.push({address_handle_root: address_handle_root[k], address_handle_chain: address_handle_chain[k], address_handle_index: address_handle_index[k]});
		}
		console.log(JSON.stringify(address_handle_extended_data));

// EXPERIMENTAL
// 		var change_address_data = []; // empty array
// 		var kk;
// 		for (kk=0;kk<1;kk++)
// 		{
// 			change_address_data.push({address_handle_root: 0, address_handle_chain: 1, address_handle_index: usechange});
// 		}
// 		console.log("change: " + JSON.stringify(change_address_data));



// INPUTS
		var inputHexTemp = "";
		var j;
		for (j=0; j<numberOfInputsinArray; j++){
//         wrapper:
			var tempOriginating = "";
			var is_ref01 = "01";
			var output_num_select = valueFromInteger(originatingTransactionArrayIndices[j]);
//         previous transaction data:
			output_num_select = Crypto.util.bytesToHex(output_num_select);
			console.log("output_num_select: " + j +" : "+ output_num_select);
			tempOriginating = is_ref01.concat(output_num_select);
			tempOriginating = tempOriginating.concat(originatingTransactionArray[j]);
			inputHexTemp = inputHexTemp.concat(tempOriginating);
		}
// END INPUTS
        var tempBuffer = ByteBuffer.allocate(1024);
// OUTPUTS
        var is_ref00 = "00";
        unsignedtx = is_ref00.concat(unsignedtx);
        console.log("utx = " + unsignedtx);
        var hashtype = "01000000";
        unsignedtx = unsignedtx.concat(hashtype);

        unsignedtx = inputHexTemp.concat(unsignedtx);
        
		var sizeOfInput =  unsignedtx.length;
        console.log("sizeOfInput = " + sizeOfInput);

        var bb = ByteBuffer.allocate((sizeOfInput/2)+64);

        var i;
        for (i = 0; i < sizeOfInput; i += 2) {
            var value = unsignedtx.substring(i, i + 2);
            // 		console.log("value = " + value);		
            var prefix = "0x";
            var together = prefix.concat(value);
            // 		console.log("together = " + together);
            var result = parseInt(together);
            // 		console.log("result = " + result);

            bb.writeUint8(result);
        }
        bb.flip();
// END OUTPUTS


		for(m = 0; m < numberOfInputsinArray; m++)
		{
			console.log("address_handle_root["+m+"]" + address_handle_root[m]);       
			console.log("address_handle_chain["+m+"]" + address_handle_chain[m]);       
			console.log("address_handle_index["+m+"]" + address_handle_index[m]);       
      	}

        var txContents = new Device.SignTransactionExtended({
//             "change_address": {address_handle_root: 0, address_handle_chain: 1, address_handle_index: usechange}
//             ,
        	"address_handle_extended": address_handle_extended_data
        	,
            "transaction_data": bb
        });
        
		console.log("txContents: " + JSON.stringify(txContents));
        tempBuffer = txContents.encode();
        
        
        var tempTXstring = tempBuffer.toString('hex');
//         document.getElementById("temp_results").innerHTML = tempTXstring;
        txSize = d2h((tempTXstring.length) / 2).toString('hex');
        // 	console.log("txSize = " + txSize);
        // 	console.log("txSize.length = " + txSize.length);
        var j;
        var txLengthOriginal = txSize.length;
        for (j = 0; j < (8 - txLengthOriginal); j++) {
            var prefix = "0";
            txSize = prefix.concat(txSize);
        }
        // 	console.log("txSizePadded = " + txSize);
        tempTXstring = txSize.concat(tempTXstring);

        var command = "0065"; // extended
        tempTXstring = command.concat(tempTXstring);

        var magic = "2323"
        tempTXstring = magic.concat(tempTXstring);
        document.getElementById("device_signed_transaction").textContent = tempTXstring;

        console.log("Setting change address");
        setChangeAddress(usechange);
        console.log("READY");

    }

    var sendTransactionForSigning = function() {
        var preppedForDevice = document.getElementById("device_signed_transaction").textContent;
        // 	console.log("send to device = " + preppedForDevice);
        autoCannedTransaction(preppedForDevice);
        pausecomp(50);
        hidWriteRawData(deviceCommands.button_ack);

    }


////////////////////////////
// Send QR code request
// Will only display from the receive chain and must be handed the index not the full address.
////////////////////////////

    var requestQRdisplay = function(address_handle_index) 
    {
        var ProtoBuf = dcodeIO.ProtoBuf;
        var ByteBuffer = dcodeIO.ByteBuffer;
        var builder = ProtoBuf.loadProtoFile("js/messages.proto"),
            Device = builder.build();

        var txContents = new Device.DisplayAddressAsQR({
        	"address_handle_index": address_handle_index
        });
        
        
        tempBuffer = txContents.encode();
        
        
        var tempTXstring = tempBuffer.toString('hex');
//         document.getElementById("temp_results").innerHTML = tempTXstring;
        txSize = d2h((tempTXstring.length) / 2).toString('hex');
        // 	console.log("txSize = " + txSize);
        // 	console.log("txSize.length = " + txSize.length);
        var j;
        var txLengthOriginal = txSize.length;
        for (j = 0; j < (8 - txLengthOriginal); j++) {
            var prefix = "0";
            txSize = prefix.concat(txSize);
        }
        // 	console.log("txSizePadded = " + txSize);
        tempTXstring = txSize.concat(tempTXstring);

        var command = "0080";
        tempTXstring = command.concat(tempTXstring);

        var magic = "2323"
        tempTXstring = magic.concat(tempTXstring);
        autoCannedTransaction(tempTXstring);
    }


////////////////////////////
// Send set change address for transaction to follow
// Will only use from the change chain and must be handed the index not the full address.
////////////////////////////

    var setChangeAddress = function(address_handle_index) 
    {
        var ProtoBuf2 = dcodeIO.ProtoBuf;
//         var ByteBuffer2 = dcodeIO.ByteBuffer;
        var builder2 = ProtoBuf2.loadProtoFile("js/messages.proto"),
            Device2 = builder2.build();

        var txContents = new Device2.SetChangeAddressIndex({
        	"address_handle_index": address_handle_index
        });
        
        
        tempBuffer = txContents.encode();
        
        
        var tempTXstring = tempBuffer.toString('hex');
//         document.getElementById("temp_results").innerHTML = tempTXstring;
        txSize = d2h((tempTXstring.length) / 2).toString('hex');
        // 	console.log("txSize = " + txSize);
        // 	console.log("txSize.length = " + txSize.length);
        var j;
        var txLengthOriginal = txSize.length;
        for (j = 0; j < (8 - txLengthOriginal); j++) {
            var prefix = "0";
            txSize = prefix.concat(txSize);
        }
        // 	console.log("txSizePadded = " + txSize);
        tempTXstring = txSize.concat(tempTXstring);

        var command = "0066";
        tempTXstring = command.concat(tempTXstring);

        var magic = "2323"
        tempTXstring = magic.concat(tempTXstring);
        autoCannedTransaction(tempTXstring);
    }



    ///////////////////////////////////////////////////////////////////////////////////////
    // PROTOBUF (end)
    ///////////////////////////////////////////////////////////////////////////////////////

    // constants 
    var pollInterval = 500;

    var hidapiPluginConstants = {
//         VendorID: 0x051B,
        VendorID: 0x03EB,
        ProductID: 0x204F
            //0x6E68   
    };

    var deviceCommands = {
        ping: '23230000000000070A0548656C6C6F',
        format_storage: '2323000D000000220A204242424242424242424242424242424242424242424242424242424242424242',
        button_ack: '2323005100000000',
        button_cancel: '2323005200000000',
        pin_cancel: '2323005500000000',
        otp_cancel: '2323005800000000',
		GetAllWallets: '2323008100000000',

        list_wallets: '2323001000000000',

        scan_wallet: '2323006100000000',
        new_wallet_0:  '23230004000000020800',
        new_wallet_1:  '23230004000000020801',
        new_wallet_2:  '23230004000000020802',
        new_wallet_3:  '23230004000000020803',
        new_wallet_4:  '23230004000000020804',
        new_wallet_5:  '23230004000000020805',
        new_wallet_6:  '23230004000000020806',
        new_wallet_7:  '23230004000000020807',
        new_wallet_8:  '23230004000000020808',
        new_wallet_9:  '23230004000000020809',
        new_wallet_10: '2323000400000002080A',
        new_wallet_11: '2323000400000002080B',
        new_wallet_12: '2323000400000002080C',
        new_wallet_13: '2323000400000002080D',
        new_wallet_14: '2323000400000002080E',
        new_wallet_15: '2323000400000002080F',
        new_wallet_16: '23230004000000020810',
        new_wallet_17: '23230004000000020811',
        new_wallet_18: '23230004000000020812',
        new_wallet_19: '23230004000000020813',
        new_wallet_20: '23230004000000020814',
        new_wallet_21: '23230004000000020815',
        new_wallet_22: '23230004000000020816',
        new_wallet_23: '23230004000000020817',
        new_wallet_24: '23230004000000020818',
        new_wallet_25: '23230004000000020819',

        load_wallet:    '2323000B00000000',
        load_wallet_0:  '2323000B000000020800',
        load_wallet_1:  '2323000B000000020801',
        load_wallet_2:  '2323000B000000020802',
        load_wallet_3:  '2323000B000000020803',
        load_wallet_4:  '2323000B000000020804',
        load_wallet_5:  '2323000B000000020805',
        load_wallet_6:  '2323000B000000020806',
        load_wallet_7:  '2323000B000000020807',
        load_wallet_8:  '2323000B000000020808',
        load_wallet_9:  '2323000B000000020809',
        load_wallet_10: '2323000B00000002080A',
        load_wallet_11: '2323000B00000002080B',
        load_wallet_12: '2323000B00000002080C',
        load_wallet_13: '2323000B00000002080D',
        load_wallet_14: '2323000B00000002080E',
        load_wallet_15: '2323000B00000002080F',
        load_wallet_16: '2323000B000000020810',
        load_wallet_17: '2323000B000000020811',
        load_wallet_18: '2323000B000000020812',
        load_wallet_19: '2323000B000000020813',
        load_wallet_20: '2323000B000000020814',
        load_wallet_21: '2323000B000000020815',
        load_wallet_22: '2323000B000000020816',
        load_wallet_23: '2323000B000000020817',
        load_wallet_24: '2323000B000000020818',
        load_wallet_25: '2323000B000000020819',

        delete_wallet_0: '23230016000000020800',
        delete_wallet_1: '23230016000000020801',
        delete_wallet_2: '23230016000000020802',
        delete_wallet_3: '23230016000000020803',
        delete_wallet_4: '23230016000000020804',
        delete_wallet_5: '23230016000000020805',

        get_entropy_4096_bytes: '2323001400000003088020',
        get_entropy_32_bytes: '23230014000000020820',
        reset_lang: '2323005900000000',
//         reset_16u2: '2323001100000000',
        get_device_uuid: '2323001300000000',
        features: '2323003A00000000',
        deadbeef: '7E7E'
    };



    function pausecomp(ms) {
        ms += new Date().getTime();
        while (new Date() < ms) {}
    }


    // "globals" 
    var incoming = '';
    var prevsD = '';
    var plugin;
    var result;
    var path;
    var device = null;
    var deviceUnplugged = false;
    var deviceOpen = false;
    var edge = false;

    function pausecomp(milliseconds) {
        var start = new Date().getTime();
        for (var i = 0; i < 1e7; i++) {
            if ((new Date().getTime() - start) > milliseconds) {
                break;
            }
        }
    }


    String.prototype.chunk = function(n) {
        if (typeof n == 'undefined') n = 2;
        return this.match(RegExp('.{1,' + n + '}', 'g'));
    };

    var padding = Array(64).join('0');

    function pad(pad, str, padLeft) {
        if (str == undefined) return pad;
        if (padLeft) {
            return (pad + str).slice(-pad.length);
        } else {
            return (str + pad).substring(0, pad.length);
        }
    }

    function d2h(d) {
        return d.toString(16);
    }

    function h2d(h) {
        return parseInt(h, 16);
    }

    function toHex(str) {
        var hex = '';
        for (var i = 0; i < str.length; i++) {
            hex += '' + str.charCodeAt(i).toString(16);
        }
        return hex;
    }

    function toHexPadded40bytes(str) {
        var hex = '';
        var targetlength = 40;
		var bytes;
        if (str.length <= targetlength) {
            length = str.length;
        }
		hex = Crypto.util.bytesToHex(Crypto.charenc.UTF8.stringToBytes(str));
        while (hex.length < (targetlength*2)) {
            hex += '20';
        }
        return hex;
    }



    function hex2a(hexx) {
        var hex = hexx.toString(); //force conversion
        var str = '';
        for (var i = 0; i < hex.length; i += 2)
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        return str;
    }






    ///////////////////////////////////////////////////////////////////////////////////////
    // HID functions
    ///////////////////////////////////////////////////////////////////////////////////////

    function pluginLoaded() {
        pluginDetect();
        console.log("Plugin loaded!");
        hidScan();
    }

    // function pluginDetect() install, detect plugin 
    var FireBreath;
    var el = "";
    var mimeType = "application/x-hidapibrowserplugin";
    var name = "hidapiBrowserPlugin";

    function pluginDetect() {
            if (typeof FireBreath === 'undefined') {
                FireBreath = {};
                FireBreath.pluginDefs = {};

                if (typeof(navigator.plugins[name]) != "undefined") {
                    var re = /([0-9.]+)\.dll/; // look for the version at the end of the filename, before dll

                    // Get the filename
                    var filename = navigator.plugins[name].filename;
                    // Search for the version
                    var fnd;
                    fnd = re.exec(filename);
                    if (fnd === null) { // no version found
                        return true; // plugin installed, unknown version
                    } else {
                        return fnd[1]; // plugin installed, returning version
                    }

                } // end if typeof(navigator.plugins[name]) != "undefined" 
                else { //	else not installed; install it now: 
                    alert("Plugin not installed. ");
                }
            } // end if typeof FireBreath === 'undefined'
        } // end function pluginDetect() 

    function hidScan() {
            plugin = document.getElementById("hidapiPlugin");
            result = plugin.hid_enumerate();

            for (var i = 0; i < result.length; i++) {
                if ((result[i]["vendor_id"] == hidapiPluginConstants.VendorID) && (result[i]["product_id"] == hidapiPluginConstants.ProductID)) {
                    document.getElementById("status").innerHTML = "Device Connected";
                    path = result[i]["path"];
                    break;
                }
            }
            if (typeof path == "undefined") {
                deviceOpen = false;
                document.getElementById("status").innerHTML = "Device not found";
                // 				alert("Device not found");
                return;
            }
            if (deviceOpen == false) {
                device = plugin.hid_open_path(path);
                if (device == null) {
                    alert("Error opening device");
                    deviceOpen = false;
                    return;
                } else {
                    deviceOpen = true;
                    deviceUnplugged = false;
//                     plugin.hid_set_nonblocking(device, 1);
                    setTimeout(monitorUSBHID, POLL_INTERVAL); //##########################
                    console.log("hidScan: Found USB device");
                }
            } else {
                console.log("hidScan: USB device online");
            }
        } //end hidScan()

    function monitorUSBHID() {
            if (device != null) { // device enumerated, opened
                hidReadData(); //Parse incoming frame
            } else if (deviceUnplugged == true) { // unplugged 
                result = null;
                result = plugin.hid_enumerate();
                if (result != null) {
                    // plugged back in? finish hidScan():  this needs some work still
                    for (var i = 0; i < result.length; i++) {
                        if ((result[i]["vendor_id"] == hidapiPluginConstants.VendorID) && (result[i]["product_id"] == hidapiPluginConstants.ProductID)) {
                            path = result[i]["path"];
                            if (typeof path == "undefined") {
                                deviceOpen = false;
                                alert("Device not found");
                            }
                            if (deviceOpen == false) {
                                device = plugin.hid_open_path(path);
                                if (device == null) {
                                    document.getElementById("status").innerHTML = "Error opening device";
                                    // 									alert("Error opening device");
                                    deviceOpen = false;
                                } else {
                                    deviceOpen = true;
                                    deviceUnplugged = false;
                                    setTimeout(monitorUSBHID, POLL_INTERVAL); //##########################
                                    document.getElementById("status").innerHTML = "Device Connected";
                                    // 									alert("monitorUSBHID: Found HID device");
                                }
                            } else {
                                document.getElementById("status").innerHTML = "Device reconnected";
                                // 								alert("Device re-opened");
                            }
                            break;
                        }
                    }
                } //  end  if (result != null) 
            } //  end  else if (deviceUnplugged == true) 
            setTimeout(monitorUSBHID, POLL_INTERVAL); //##########################
        } //end monitorUSBHID

    function hidWriteData(dataToSend) {
        var sendToDevice = '';
        var name_element = document.getElementById(dataToSend);
        var name = name_element.value;
        sendToDevice = name;
        sendToDevice = '00' + sendToDevice + '7E7E';
        var txResult = device.hid_write(sendToDevice);
        // 			console.log('HID TX size: ' + txResult);
    }

    function hidWriteRawData(dataToSend) {
        sendToDevice = '00' + dataToSend + '7E7E';
        var txResult = device.hid_write(sendToDevice);
//         console.log("TX: " + sendToDevice);
    }

    function hidAskFeature() {
        sendToDevice = '01';
        var txResult = device.hid_send_feature_report(sendToDevice);
//         console.log("TX: " + sendToDevice);
    }


    //Grab the incoming frame 
    function hidReadData() {
        var sD = '';
        var magic = '2323';
        sD = device.hid_read(64);
        if (((sD[60] != 2) || (sD[61] != 3)) && ((sD[62] == 2) && (sD[63] == 3))) {
            //                     console.log('EDGE:' + sD);
            sD = sD + device.hid_read(64);
            //                     console.log('EDGE WRAP:' + sD);
        }

        if (sD.match(/2323/)) {
            headerPosition = sD.search(2323)
            if (headerPosition >= 48) sD = sD + device.hid_read(64);
            var command = sD.substring(headerPosition + 4, headerPosition + 8)
            document.getElementById("command").innerHTML = command;
            var payloadSize = sD.substring(headerPosition + 8, headerPosition + 16)
            decPayloadSize = h2d(payloadSize);
            document.getElementById("payLoadSize").innerHTML = payloadSize;
            while ((headerPosition + 16 + 2 * (decPayloadSize)) > sD.length) {
                sD = sD + device.hid_read(64);
            }
            var payload = sD.substring(headerPosition + 16, headerPosition + 16 + (2 * (decPayloadSize)))
            document.getElementById("payload_HEX").innerHTML = payload;
            document.getElementById("payload_ASCII").innerHTML = hex2a(payload);
            processResults(command, payloadSize, payload);
        }
//                 console.log('RX: ' + sD);

        if (deviceUnplugged == false && sD == "") { //If nothing is detected, close down port
            console.log("Device unplugged");
            document.getElementById("status").innerHTML = "Device disconnected";
            closeDevice();
            deviceUnplugged = true;
            //                setTimeout(monitorUSBHID, 2000);
            return;
        }
    }



    function closeDevice() { // works 
        if (device) {
            device.close(device);
            device = null;
            deviceOpen = false;
            console.log("HID device closed");
        }
    }

    ///////////////////////////////////////////////////////////////////////////////////////
    // HID functions END
    ///////////////////////////////////////////////////////////////////////////////////////








    function processResults(command, length, payload) {
            var ProtoBuf = dcodeIO.ProtoBuf;
            var ByteBuffer = dcodeIO.ByteBuffer;
            var builder = ProtoBuf.loadProtoFile("js/messages.proto"),
                Device = builder.build();

// 			console.log("RX: " + command);
            command = command.substring(2, 4)
            console.log('to process:' + command + ' ' + length + ' ' + payload);
            switch (command) {
                case "3A": // initialize
//                     var featuresMessage = Device.Features.decodeHex(payload);
//                     console.log("vendor: " + featuresMessage.vendor);
//                     console.log("config: " + featuresMessage.config);
//                     console.log("device name: " + featuresMessage.device_name);
// 					document.getElementById("device_name").innerHTML = featuresMessage.device_name;
                    break;
                case "30": // public address
                    ecdsa = payload.substring(8, 74);
                    // 					ecdsa = payload.substring(8,138); //uncompressed
                    // 					console.log('ecdsa from device ' + ecdsa);
                    document.getElementById("ecdsa").innerHTML = ecdsa;
                    ripe160of2 = payload.substring(78, 118);
                    // 					ripe160of2 = payload.substring(142,182);
                    document.getElementById("ripe160of2").innerHTML = ripe160of2;
                    // 					console.log('RIPE from device ' + ripe160of2);
                    pub58 = ecdsaToBase58(ecdsa);
                    document.getElementById("address_58").innerHTML = pub58;

                    break;
                case "31": // number of addresses in loaded wallet
                    numberOfAddresses = payload.substring(2, 4);
                    // 					console.log('# of addresses ' + numberOfAddresses);
                    document.getElementById("numberOfAddresses").innerHTML = numberOfAddresses;

                    break;
                case "32": // Wallet list
                    var walletMessage = Device.Wallets.decodeHex(payload);
							
                    console.log("number of wallets: " + walletMessage.wallet_info.length);
                    var walletsIndex;
                    for (walletsIndex=0; walletsIndex < walletMessage.wallet_info.length; walletsIndex++){
						console.log("wallet structure number: " + walletMessage.wallet_info[walletsIndex].wallet_number);
						console.log("wallet structure name: " + walletMessage.wallet_info[walletsIndex].wallet_name.toString("utf8"));
						console.log("wallet structure uuid: " + walletMessage.wallet_info[walletsIndex].wallet_uuid.toString("hex"));
						console.log("wallet version: " + walletMessage.wallet_info[walletsIndex].version);
                    }

                	var securedWallet = ''
                    $("#wallet_table").find("tr").remove();
                    var walletDataArray = "";
                    walletDataArray = walletMessage.wallet_info;
                    var index;
                    for (index = 0; index < walletDataArray.length; index++) {
                    	if(	walletMessage.wallet_info[index].version == 3)
                    	{
                    		securedWallet = ' <span class="glyphicon glyphicon-lock"></span>'
                    	}
                        var wallet_number = walletMessage.wallet_info[index].wallet_number;
                        var wallet_name = walletMessage.wallet_info[index].wallet_name.toString("utf8");
                        var row = '<tr id="wallet_' + wallet_number + '"><td class="iterator">' + wallet_number + '</td><td class="address-field" id="name_' + wallet_number + '" style="cursor:pointer">' + wallet_name + securedWallet +'</td></tr>';
                        $('#wallet_table').append(row);
                        securedWallet = '';
                    }
                    break;

                if (chain === 'receive') {
                    qrcode = ' <span class="open-qroverlay glyphicon glyphicon-qrcode" data-toggle="modal" data-target="#qroverlay" data-addr="' + childaddr + '"></span>';
                    qrcode2 = ' <span class="open-sendMsgFrom glyphicon glyphicon-envelope" data-target="#sign" data-addr="' + childaddr + '" data-index="' + index + '" data-chain="' + chain + '"></span>';
                }
                var row = '<tr id="' + childaddr + '"><td class="iterator">' + index + '</td><td class="address-field">' + childaddr + qrcode + qrcode2 + '</td><td class="balance">?</td></tr>';
                $('#' + chain + '_table').append(row);
                addresses[chain][childaddr] = childkey;






                case "33": // Ping response
                    var PingResponse = Device.PingResponse.decodeHex(payload);
                    console.log(PingResponse);
                    console.log('echo: ' + PingResponse.echoed_greeting + ' session ID: ' + PingResponse.echoed_session_id);
                    break;
                    //         		case 09: // ping return
                    //         			break;
                    //         		case 50: // button ack
                    //         			break;
                case "34": // success
                    break;
                case "35": // general purpose error/cancel
//                     var Failure = Device.Failure.decodeHex(payload);
//                     console.log(Failure);
//                     console.log('error #: ' + Failure.error_code + ' error: ' + Failure.error_message);
                    break;
                case "36": // device uuid return
                    var DeviceUUID = Device.DeviceUUID.decodeHex(payload);
                    console.log('device uuid: ' + DeviceUUID.device_uuid.toString("hex"));
                    break;
                case "37": // entropy return
                    var Entropy = Device.Entropy.decodeHex(payload);
                    console.log('ReturnedEntropy: ' + Entropy.entropy);
                    break;
                case "39": // signature return [original]
                    var Signature = Device.Signature.decodeHex(payload);
                    // 					Signature.signature_data
                    break;
                case "50": // #define PACKET_TYPE_ACK_REQUEST			0x50
					autoCannedTransaction(deviceCommands.button_ack);
                    break;
                case "62": // parse & insert xpub from current wallet //RETURN from scan wallet
                    var CurrentWalletXPUB = Device.CurrentWalletXPUB.decodeHex(payload);
                    // 					$("#bip32_source_key").CurrentWalletXPUB.xpub;

                    document.getElementById("bip32_source_key").textContent = CurrentWalletXPUB.xpub;
// 					pausecomp(500);

                    // 					make sure the xpub is evaluated:
                    var source_key = $("#bip32_source_key").val();
//                     var source_key = CurrentWalletXPUB.xpub;
                    useNewKey(source_key);

                    break;
                case "64": // signature return
                    var SignatureComplete = Device.SignatureComplete.decodeHex(payload);
// 					console.log("SignatureComplete: " + SignatureComplete.signature_complete_data);
//                  console.log("number of signatures: " + SignatureComplete.signature_complete_data.length);
                    var sigIndex;
                    var unSignedTransaction = document.getElementById("output_transaction").value;
// 					console.log("unSignedTransaction pre: " + unSignedTransaction);
                    
                    for (sigIndex=0; sigIndex < SignatureComplete.signature_complete_data.length; sigIndex++){
                    
                    	var payloadSig = SignatureComplete.signature_complete_data[sigIndex].signature_data_complete.toString("hex");
                    	var payloadSigSizeHex = payloadSig.substring(0, 2);
                    	var payloadSigSizeDec = h2d(payloadSigSizeHex);
                    	var payloadSigSizeChars = 2 + (payloadSigSizeDec * 2);
// 						console.log("SignatureComplete:Data:signature_data_complete " + sigIndex + "  SIZE (HEX) " + payloadSigSizeHex + "  SIZE (DEC) " + payloadSigSizeDec);
// 						console.log("SignatureComplete:Data:signature_data_complete RAW " + sigIndex + " " + payloadSig);
						payloadSig = payloadSig.substring(0, payloadSigSizeChars);
// 						console.log("SignatureComplete:Data:signature_data_complete TRIM " + sigIndex + " " + payloadSig);
						var scriptPrefix = "19";
						var script = scriptPrefix.concat(scriptsToReplace[sigIndex]);

// 						console.log("script to replace: " + script);
// 						console.log("unSignedTransaction: " + unSignedTransaction);

						unSignedTransaction = unSignedTransaction.replace(script, payloadSig);
// 						console.log("SignatureComplete:Data:signature_data_complete part SIGNED " + sigIndex + " " + unSignedTransaction);
                    }
// 					console.log("SignatureComplete:Data:signature_data_complete SIGNED " + unSignedTransaction);
//                     document.getElementById("ready_to_transmit").textContent = unSignedTransaction;
                    document.getElementById("rawTransaction").textContent = unSignedTransaction;
                    $("#signedtxlabel").show()

                    $("#submit_signed_transaction").removeAttr('disabled');

										
                    break;

                case "71": // message signing return
                	console.log("########## in case 71 ###########");
                    var SignatureMessage = Device.SignatureMessage.decodeHex(payload);
                    
                    var data_size = (SignatureMessage.signature_data_complete.toString("hex").length)/2;
                    var data_size_hex = d2h(data_size);

					console.log("SigMsg signature_data length: " + data_size_hex);
					console.log("SigMsg signature_data hex: " + SignatureMessage.signature_data_complete.toString("hex"));

					var SigByteArrayHex = Crypto.util.hexToBytes(SignatureMessage.signature_data_complete.toString("hex"));

					var compressed = true;
					var addrtype = 0;
					var address = document.getElementById("sgAddr").value;
	    			var message = document.getElementById("sgMsgHidden").value;
					
					var sig = sign_message_device_processing(message, address, SigByteArrayHex, compressed, addrtype);

					sgData = {"message":message, "address":address, "signature":sig};
					var sgType = 'inputs_io';
					
					$('#sgSig').val(makeSignedMessage(sgType, sgData.message, sgData.address, sgData.signature));


                    break;
                case "82": // bulk return
                	console.log("########## in case 82 ###########");
                    Bulk = Device.Bulk.decodeHex(payload);
                    
                    var data_size = (Bulk.bulk.toString("hex").length)/2;
                    var data_size_hex = d2h(data_size);

					BulkString = Bulk.bulk.toString("hex")
// 					console.log("Bulk.bulk raw: " + Bulk.bulk);
					console.log("Bulk.bulk length: " + data_size_hex);
					console.log("Bulk.bulk hex: " + BulkString);


                    break;


                default:
                	break;
            } //switch

        } //function processResults

    function compareRIPE160() {
        var areEqual = dev.toUpperCase() === calc.toUpperCase();
        if (areEqual) {
            document.getElementById("RIPEDEVICE").addClass("has-success has-feedback");
        }
    }
    var tempRIPECALC;

    function ecdsaToBase58(publicKeyHex) {
        //could use publicKeyBytesCompressed as well
        var hash160 = Crypto.RIPEMD160(Crypto.util.hexToBytes(Crypto.SHA256(Crypto.util.hexToBytes(publicKeyHex))))

        document.getElementById("ripe160of2_CALC").innerHTML = hash160.toUpperCase();

        var version = 0x00 //if using testnet, would use 0x6F or 111.
        var hashAndBytes = Crypto.util.hexToBytes(hash160)
        hashAndBytes.unshift(version)

        var doubleSHA = Crypto.SHA256(Crypto.util.hexToBytes(Crypto.SHA256(hashAndBytes)))
        var addressChecksum = doubleSHA.substr(0, 8)
            // 		console.log(addressChecksum) //26268187

        var unencodedAddress = "00" + hash160 + addressChecksum

        // 		console.log(unencodedAddress)
        /* output
		  003c176e659bea0f29a3e9bf7880c112b1b31b4dc826268187
		*/

        var address = Bitcoin.Base58.encode(Crypto.util.hexToBytes(unencodedAddress))
            // 		console.log("Address58 " + address) //16UjcYNBG9GTK4uq2f7yYEbuifqCzoLMGS
        return address;
    }

    function makeListItems(theList, theID, theContent, theCount, theStart) {
        var myItems = [];
        var myList = $(theList);
        var myContent = theContent;
        var myID = theID;
        var myCount = theCount;
        var myStart = theStart;
        for (var i = myStart; i < myCount; i++) {
            myItems.push("<li><a href=\"#\" id=\"" + myID + "" + i + "\">" + myContent + " " + i + "</a></li>");
            // 			myItems.push( "<li id=\"" + myID + "" + i + "\">" +  myContent + " " + i + "</li>" );

        }

        myList.append(myItems.join(""));
    }

    function loadWalletNames() {
        hidWriteRawData(deviceCommands.list_wallets);
    }


    function autoCannedTransaction(transData) {
        chunkSize = 32;
        var chunkedTData = [];
        var tempDTS = '';
        tempDTS = transData;
//         console.log('Size of transData : ' + tempDTS.length);
        var transDataRemainder = tempDTS.length % 16;
//         console.log('Remainder : ' + transDataRemainder);
        if(transDataRemainder==0||transDataRemainder==12||transDataRemainder==14){
			var prepend = '00000000';
			tempDTS = prepend.concat(tempDTS);
		}			
//         console.log('tempDTS : ' + tempDTS);
        chunkedTData = tempDTS.chunk(chunkSize);
//         console.log('Number of chunks : ' + chunkedTData.length);
        for (i = 0; i < (chunkedTData.length - 1); i++) {
            dataToSend = chunkedTData[i];
            sendToDevice = '00' + dataToSend;
            var txResult = device.hid_write(sendToDevice);
//             console.log('HID TX : ' + sendToDevice);
//             console.log('HID TX size: ' + txResult);
            pausecomp(50);
        }

        dataToSend = chunkedTData[chunkedTData.length - 1];
//         console.log('dataToSend.length: ' + dataToSend.length); 
		sendToDevice = '00' + dataToSend + '7E7E';
		var txResult = device.hid_write(sendToDevice);
// 		console.log('HID TX : ' + sendToDevice);
// 		console.log('HID TX size: ' + txResult);
    }

    function autoCannedTransactionMega(transData) {
        chunkSize = 32;
        var chunkedTData = [];
        var tempDTS = '';
        tempDTS = transData;
        console.log('Size of transData : ' + tempDTS.length);
//         var transDataRemainder = tempDTS.length % 16;
// //         console.log('Remainder : ' + transDataRemainder);
//         if(transDataRemainder==0||transDataRemainder==12||transDataRemainder==14){
// 			var prepend = '00000000';
// 			tempDTS = prepend.concat(tempDTS);
// 		}			
//         console.log('tempDTS : ' + tempDTS);
        chunkedTData = tempDTS.chunk(chunkSize);
        console.log('Number of chunks : ' + chunkedTData.length);
        for (i = 0; i < (chunkedTData.length - 1); i++) {
            dataToSend = chunkedTData[i];
            sendToDevice = '00' + dataToSend;
            var txResult = device.hid_write(sendToDevice);
            console.log('HID TX : ' + sendToDevice);
            console.log('HID TX size: ' + txResult);
            pausecomp(50);
        }

        dataToSend = chunkedTData[chunkedTData.length - 1];
//         console.log('dataToSend.length: ' + dataToSend.length); 
		sendToDevice = '00' + dataToSend;
		var txResult = device.hid_write(sendToDevice);
// 		console.log('HID TX : ' + sendToDevice);
// 		console.log('HID TX size: ' + txResult);
    }



    ///////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////
    // LOCKBOX SPECIFIC END
    ///////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////




    ///////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////
    // BIP32 SPECIFIC 
    ///////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////



    var MAINNET_PUBLIC = 0x0488b21e;
    var MAINNET_PRIVATE = 0x0488ade4;
    var TESTNET_PUBLIC = 0x043587cf;
    var TESTNET_PRIVATE = 0x04358394;
    
    var DOGE_PUBLIC = 0x02facafd;
    var DOGE_PRIVATE = 0x02fac398;
    
    var LTC_PUBLIC = 0x019da462;
    var LTC_PRIVATE = 0x019d9cfe;

    var RECEIVE_CHAIN = 0;
    var CHANGE_CHAIN = 1;

    var GAP = 5; // how many extra addresses to generate

    var key = null;
    var network = null;
    var addresses = {
        "receive": {},
        "change": {}
    };;
    var balance = 0;
    var pending = 0;
    var unspent = {};
    var lastone = {
        "receive": GAP,
        "change": GAP
    };
    var chains = {
        "receive": null,
        "change": null
    };
    var usechange = 0;

    var clearData = function() {
        key = null;
        network = null;
        addresses = {
            "receive": {},
            "change": {}
        };
        balance = 0;
        pending = 0;
        unspent = {};
        lastone = {
            "receive": GAP,
            "change": GAP
        };
        chains = {
            "receive": null,
            "change": null
        };
        usechange = 0;

        $("#receive_table").find("tr").remove();
        $("#change_table").find("tr").remove();
        $("#balance_display").text('?');
    }

    var ops = Bitcoin.Opcode.map;

    //------------
    // From https://gist.github.com/paolorossi/5747533
    function Queue(handler) {
            var queue = [];

            function run() {
                var callback = function() {
                        queue.shift();
                        // when the handler says it's finished (i.e. runs the callback)
                        // We check for more tasks in the queue and if there are any we run again
                        if (queue.length > 0) {
                            run();
                        }
                    }
                    // give the first item in the queue & the callback to the handler
                handler(queue[0], callback);
            }

            // push the task to the queue. If the queue was empty before the task was pushed
            // we run the task.
            this.append = function(task) {
                queue.push(task);
                if (queue.length === 1) {
                    run();
                }
            }
        }
        // small handler that launch task and calls the callback
        // when its finished
    var queue = new Queue(function(task, callback) {
        task(function() {
            // call an option callback from the task
            if (task.callback)
                task.callback();
            // call the buffer callback.
            callback();
        });
    });
    //------------



    var getAddr = function(key) {
        var hash160 = key.eckey.getPubKeyHash();
        var addr = new Bitcoin.Address(hash160);
        addr.version = 0x6f; // testnet
        return addr.toString();
    }

    var generate = function() {

        for (var i = 0; i < 12; i++) {
            c = b.derive_child(i);
            childs.push(c);
            addresses.push(getAddr(c));
            $("#results").append(getAddr(c) + "<br>");
        }

    }

    var hashFromAddr = function(string) {

        var bytes = Bitcoin.Base58.decode(string);
        var hash = bytes.slice(0, 21);
        var checksum = Crypto.SHA256(Crypto.SHA256(hash, {
            asBytes: true
        }), {
            asBytes: true
        });

        if (checksum[0] != bytes[21] ||
            checksum[1] != bytes[22] ||
            checksum[2] != bytes[23] ||
            checksum[3] != bytes[24]) {
            throw "Checksum validation failed!";
        }

        this.version = hash.shift();
        this.hash = hash;
        return hash;
    }

    var createOutScript = function(address) {
        var script = new Bitcoin.Script();
        script.writeOp(ops.OP_DUP);
        script.writeOp(ops.OP_HASH160);
        script.writeBytes(hashFromAddr(address));
        script.writeOp(ops.OP_EQUALVERIFY);
        script.writeOp(ops.OP_CHECKSIG);
        return script;
    }

    var valueFromNumber = function(number) {
        var value = BigInteger.valueOf(number * 1e8);
        value = value.toByteArrayUnsigned().reverse();
        while (value.length < 8) value.push(0);
        return value;
    }


// The BigInteger routines in bitcoinjs-lib are not able to correctly evaluate a decimal number passed.
// Therefore we have to pass it as a hexadecimal string.
//  Changes in bitcoinjs-lib:
// 	4713+ BigInteger.valueOfString = nbvS;
// 	3014+ function nbvS(i) { var r = nbi(); r.fromString(i,16); return r; }

    var valueFromSatoshi = function(number) {
    	console.log("======= in vFS ===============");
    	console.log("vFS number: " + number);
    	console.log("vFS d2h(number): " + d2h(number));

        var value = BigInteger.valueOfString(d2h(number),16);
        console.log("vFS value " + value);

        value = value.toByteArrayUnsigned().reverse();
        console.log("vFS value bAU R: " + value);
        while (value.length < 8) value.push(0);
        console.log("vFS value bAU R to 8: " + value);
    	console.log("======= exiting vFS ==========");
        return value;
    }

    var valueFromInteger = function(number) {
        var value = BigInteger.valueOf(number);
        value = value.toByteArrayUnsigned().reverse();
        while (value.length < 4) value.push(0);
        return value;
    }


    var parseScriptString = function(scriptString) {
        var opm = Bitcoin.Opcode.map;
        var inst = scriptString.split(" ");
        var bytescript = [];
        for (thisinst in inst) {
            var part = inst[thisinst];
            if ("string" !== typeof part) {
                continue;
            }
            if ((part.length > 3) && (part.slice(0, 3) == 'OP_')) {
                for (name in opm) {
                    if (name == part) {
                        bytescript.push(opm[name])
                    }
                }
            } else if (part.length > 0) {
                bytescript.push(Bitcoin.Util.hexToBytes(part));
            }
        }
        return bytescript;
    };

    var goodUpdate = function(addr) {
        return function(data, textStatus, jqXHR) {
            unspent[addr] = data.unspent_outputs;
            thisbalance = 0;
            thispending = 0;
            for (var x = 0; x < unspent[addr].length; x++) {
                if (confirmations === 0) {											//fix this to withhold unconfirmed
                    thispending += unspent[addr][x].value;
                } else {
                    thisbalance += unspent[addr][x].value;
                }
            }
            balance += thisbalance;
            $("#balance_display").text(balance / 100000000); // Satoshi to BTC
            $("#" + addr).children(".balance").text(thisbalance / 100000000);
        };
    }
    var noUpdate = function(addr) {
        return function(jqXHR, textStatus, errorThrown) {
            if (jqXHR.status != 500) {
                console.log(errorThrown);
            } else {
                $("#" + addr).children(".balance").text(0);
            }
        }
    }
//     var reUpdateBalances = function() {
//         var addresslist = [];
//         for (var k in addresses) {
//             addresslist = addresslist.concat(Object.keys(addresses[k]));
//         }
//         balance = 0;
//         for (var i = 0; i < addresslist.length; i++) {
//             var addr = addresslist[i]
//     		console.log('reUpdateBalances: ' + addresslist[i]);
//             var jqxhr = $.get('https://blockchain.info/unspent', {
//                     "active": addr,
//                     "cors": true,
//                     "json": true,
//                     "api": "1af870b5-15c4-4584-80c3-03935f97d11b"
//                 })
//                 .done(goodUpdate(addr))
//                 .fail(noUpdate(addr))
//                 .always(function() {});
//         }
//     }

//     var gotUnspent = function(chain, index, addr) {
//         return function(data, textStatus, jqXHR) {
//         	console.log("chain " + chain);
//         	console.log("index " + index);
//         	console.log("addr " + addr);
// 			if(chain === "receive"){
// 				chain_numerical = 0;
// 				}
// 				else
// 				{
// 				chain_numerical = 1;
// 				}
//             unspent[addr] = data.unspent_outputs;
//             thisbalance = 0
//             
//             for (var x = 0; x < unspent[addr].length; x++) {
//                 thisbalance += unspent[addr][x].value;
//                 unspent[addr][x].chain = chain_numerical;
//                 unspent[addr][x].index = index;
//             }
//             balance += thisbalance;
//             $("#balance_display").text(balance / 100000000); // Satoshi to mBTC
//             $("#" + addr).children(".balance").text(thisbalance / 100000000);
//         };
//     }
    
    var gotUnspent = function(chain, index, addr) {
        return function(data, textStatus, jqXHR) {
        	console.log("chain " + chain);
        	console.log("index " + index);
        	console.log("addr " + addr);
			if(chain === "receive"){
				chain_numerical = 0;
				}
				else
				{
				chain_numerical = 1;
				}
            unspent[addr] = data;
            thisbalance = 0
            
            for (var x = 0; x < unspent[addr].length; x++) {
                thisbalance += (unspent[addr][x].amount) * 100000000;
                unspent[addr][x].chain = chain_numerical;
                unspent[addr][x].index = index;
            }
            balance += thisbalance;
            $("#balance_display").text(balance / 100000000); // Satoshi to mBTC
            $("#" + addr).children(".balance").text(thisbalance / 100000000);
        };
    }
    
    var gotUnspentError = function(chain, index, addr) {
        return function(jqXHR, textStatus, errorThrown) {
            if (jqXHR.status != 500) {
                console.log(errorThrown);
            } else {
                $("#" + addr).children(".balance").text(0);
            }
        }
    }

    var checkReceived = function(chain, index, addr, callback) {
        return function(data, textStatus, jqXHR) {
        	console.log('check if EVER received funds (checkRecv\'d\): ' + data);
            if (parseInt(data) > 0) {
                var newlast = Math.max(index + GAP + 1, lastone[chain]);
                lastone[chain] = newlast;
                queue.append(generateAddress(chain, index + 1));

                if (chain === 'change') {
                    usechange = index + 1;
                }

                $.get(serverURL + '/addr/' + addr + '/utxo', {}, 'text')


                    .done(gotUnspent(chain, index, addr))
                    .fail(gotUnspentError(chain, index, addr))
                    .always(function() {});
                callback();
            } else {
                $("#balance_display").text(balance / 100000000); // Satoshi to mBTC
                $("#" + addr).children(".balance").text(0);
                if (index < lastone[chain] - 1) {
                    queue.append(generateAddress(chain, index + 1));
                }
                callback();
            }
        }
    }


    var updateBalance = function(chain, index, addr, callback) {
        var jqxhr = $.get(serverURL + '/addr/' + addr + '/totalReceived',{}, 'text')
            .done(checkReceived(chain, index, addr, callback));
    }



	var addressListForMessages = [];
	var addressesMatrix = [];
	var addressesMatrixReceive = [];



    // Simple task to generate addresses and query them;
    var generateAddress = function(chain, index) {
        return function(callback) {
            if (chains[chain]) {
                var childkey = chains[chain].derive_child(index);
                var childaddr = childkey.eckey.getBitcoinAddress().toString();
                addressesMatrix.push(childaddr);
                var qrcode = ''
                var qrcode2 = ''
                if (chain === 'receive') {
                    qrcode = ' <span class="open-qroverlay glyphicon glyphicon-qrcode" data-toggle="modal" data-target="#qroverlay" data-addr="' + childaddr + '"></span>';
                    qrcode2 = ' <span class="open-sendMsgFrom glyphicon glyphicon-envelope" data-target="#sign" data-addr="' + childaddr + '" data-index="' + index + '" data-chain="' + chain + '"></span>';
                    addressListForMessages.push({ text: childaddr, value: index });
                    addressesMatrixReceive.push(childaddr);
               }
                var row = '<tr id="' + childaddr + '"><td class="iterator">' + index + '</td><td class="address-field">' + '<a href="http://bitlox.io/address/' + childaddr + '" target="_blank">' + childaddr + '</a>' + qrcode + qrcode2 + '</td><td class="balance">?</td></tr>';
                $('#' + chain + '_table').append(row);
                addresses[chain][childaddr] = childkey;

                if (navigator.onLine) {
                    updateBalance(chain, index, childaddr, callback);
                } else {
                    if (index < lastone[chain] - 1) {
                        queue.append(generateAddress(chain, index + 1));
                    }
                    callback();
                }
            } else {
                callback();
            }
        }
    }


// 	var getFulls = function(hashes) {
// 			$.get('https://bitcoin.toshi.io/api/v0/transactions/' + hashes[0] + '.hex')
// 			.done(function(data){
// 				fullInputTXHex[0] = data;
// 			})
// 	}

	var getFulls = function(hashes) {
			$.get(serverURL+ '/rawtx/' + hashes[0])
			.done(function(data){
				var strData = JSON.stringify(data);
				var transactionHex = JSON.parse(strData);
				fullInputTXHex[0] = transactionHex.rawtx;
			})
	}




    var genTransaction = function() {
        if (balance > 0) {
            var receiver = $("#receiver_address").val()
            var amount = Math.ceil(parseFloat($("#receiver_monies").val()) * 100000000);
            console.log("AMOUNT ########### : " + amount);
            var fee = Math.ceil(parseFloat($("#fee_monies").val()) * 100000000);
            if (!(amount > 0)) {
                console.log("Nothing to do");
            }
            if (!(fee >= 0)) {
                fee = 0;
            }
            var target = amount + fee;
            if (target > balance) {
                alert("Not enough money yo!");
                return
            } else {
                // prepare inputs
                var fullInputTransactionHash = [];
                var fullInputTXindex = [];
                var address_handle_chain = [];
                var address_handle_index = [];
// 				var scriptsToReplace = [];

//                 var incoin = [];
//                 for (var k in unspent) {
//                     var u = unspent[k];
//                     for (var i = 0; i < u.length; i++) {
//                         var ui = u[i]
//                         var coin = {
//                             "hash": ui.tx_hash,
//                             "age": ui.confirmations,
//                             "address": k,
//                             "coin": ui,
//                             "chain": ui.chain,
//                             "index": ui.index
//                         };
//             			console.log("address: " + coin.address);
// //             			console.log("coin: " + coin.coin);
//             			console.log("chain: " + coin.chain);
//             			console.log("index: " + coin.index);
//                         incoin.push(coin);
//                     }
//                 }
                var incoin = [];
                for (var k in unspent) {
                	console.log("k: " + k);
                    var u = unspent[k];
                    console.log("u.length: " + u.length);
                    for (var i = 0; i < u.length; i++) {
                        var ui = u[i]
                        var coin = {
                            "hash": ui.txid,
                            "age": ui.confirmations,
                            "address": k,
                            "coin": ui,
                            "chain": ui.chain,
                            "index": ui.index
                        };
            			console.log("address: " + coin.address);
            			console.log("hash: " + coin.hash);
            			console.log("chain: " + coin.chain);
            			console.log("index: " + coin.index);
                        incoin.push(coin);
                    }
                }
                var sortcoin = _.sortBy(incoin, function(c) {
                    return c.age;
                });

                inamount = 0;
                var tx = new Bitcoin.Transaction();

                var toaddr = new Bitcoin.Address(receiver);
                console.log("amount: " + amount);
                console.log("valueFromSatoshi(amount): " + valueFromSatoshi(amount));
                console.log("d2h(valueFromSatoshi(amount)): " + d2h(valueFromSatoshi(amount)));
                
                var to = new Bitcoin.TransactionOut({
                    value: valueFromSatoshi(amount),
                    script: Bitcoin.Script.createOutputScript(toaddr)
                });
				console.log("After new Bitcoin.TransactionOut" );

                tx.addOutput(to);
                // add in the hooks to the + button here
                
                

                var usedkeys = [];
                for (var i = 0; i < sortcoin.length; i++) {
                    var coin = sortcoin[i].coin;
                    var tin = new Bitcoin.TransactionIn({
                        outpoint: {
                            hash: Bitcoin.Util.bytesToBase64(Bitcoin.Util.hexToBytes(coin.txid).reverse()), 
                            index: coin.vout
                        },
                        script: Bitcoin.Util.hexToBytes(coin.scriptPubKey),
                        sequence: 4294967295
                    });
					scriptsToReplace[i] = coin.scriptPubKey;
                    fullInputTransactionHash[i] = Bitcoin.Util.bytesToHex(Bitcoin.Util.hexToBytes(coin.txid)); // no .reverse()!
            		console.log("fullInputTransactionHash[" + i + "]: " + fullInputTransactionHash[i]);
                    fullInputTXindex[i] = coin.vout;
                    address_handle_chain[i] = coin.chain;
                    address_handle_index[i] = coin.index;

                    tx.addInput(tin);
                    console.log("coin.value: " + coin.amount * 100000000);
                    inamount += coin.amount * 100000000;
                    console.log("inamount: " + inamount);
                    usedkeys.push(sortcoin[i].address);
                    console.log("target: " + target);
                    
                    if (inamount >= target) {
                        break;
                    }
                }

                if (inamount > target) {
                    var changeaddr = chains['change'].derive_child(usechange).eckey.getBitcoinAddress();
                    
//                     var changeaddr = chains['receive'].derive_child(0).eckey.getBitcoinAddress();
                    var ch = new Bitcoin.TransactionOut({
                        value: valueFromSatoshi(inamount - target),
                        script: Bitcoin.Script.createOutputScript(changeaddr)
                    });
                    tx.addOutput(ch);
                }

                if (key.has_private_key) {
                    for (var i = 0; i < usedkeys.length; i++) {
                        k = usedkeys[i];
                        var inchain = null;
                        if (k in addresses['receive']) {
                            inchain = addresses['receive'];
                        } else if (k in addresses['change']) {
                            inchain = addresses['change'];
                        }
                        if (inchain) {
                            tx.signWithKey(inchain[k].eckey);
                        } else {
                            console.log("Don't know about all the keys needed.");
                        }
                    }
                    $("#signedtxlabel").show()
                    $("#unsignedtxlabel").hide()
                    $("#submit_signed_transaction").removeAttr('disabled');
                } else {
                    $("#unsignedtxlabel").show()
                    $("#signedtxlabel").hide()
                    $("#preptxlabel").show()
                    
                    $("#submit_signed_transaction").attr('disabled', true);
                }
                $("#output_transaction").val(Bitcoin.Util.bytesToHex(tx.serialize()));
                var unsignedTransactionToBeCoded = Bitcoin.Util.bytesToHex(tx.serialize());
                var fullInputTXHex = [];
                var how_many_inputs = fullInputTXindex.length;
                var mCounter = 0;
                console.log("fullInputTXindex.length: " + how_many_inputs);

				$.each(fullInputTransactionHash, function(i, val){
					console.log("in each: " + i + " " + val);

					$.get(serverURL + '/rawtx/' + val )
						.done
						(
							function(data)
								{
									var str = JSON.stringify(data);
									var transactionHex2 = JSON.parse(str);
									console.log("in each done: "  + transactionHex2.rawtx + " i:" + i);
									fullInputTXHex[i] = transactionHex2.rawtx;
									mCounter++;
									if(mCounter == how_many_inputs){prepForSigning(unsignedTransactionToBeCoded, fullInputTXHex, fullInputTXindex, address_handle_chain, address_handle_index)}
								}
						)
					} // end each function
				) // end each
 
  
 
                console.log("fullInputTXindex: " + fullInputTXindex);
                console.log("unsignedTransactionToBeCoded: " + unsignedTransactionToBeCoded);
				for(m=0; m < how_many_inputs; m++)
				{
                console.log("scripts to replace: " + scriptsToReplace[m]);
				}



                return tx;

            }
        }
    }


// 	var submitTransaction = function() {
// 	var signedTransactionHex = document.getElementById("output_transaction").value;
// 	console.log("Hex to transmit: " + signedTransactionHex);
// 		$.post( "https://bitcoin.toshi.io/api/v0/transactions", '{"hex": "' + signedTransactionHex + '"}' )
// 		  .done(function( data ) {
// 			alert( "Data Loaded: " + data );
// 		  });
// 	}


//     var iterateTXhashes = function() {
// 
//     }

    var useNewKey = function(source_key) {
        var keylabel = "";
        var networklabel = "";
        clearData();

        try {
            key = new BIP32(source_key);
        } catch (e) {
            console.log(source_key);
            console.log("Incorrect key?");
        }
        if (key) {
            switch (key.version) {
                case MAINNET_PUBLIC:
                    keylabel = "Public key";
                    network = 'prod';
                    networklabel = "Bitcoin Mainnet";
                    break;
                case MAINNET_PRIVATE:
                    keylabel = "Private key";
                    network = 'prod';
                    networklabel = "Bitcoin Mainnet";
                    break;
                case TESTNET_PUBLIC:
                    keylabel = "Public key";
                    network = 'test';
                    networklabel = "Bitcoin Testnet";
                    break;
                case TESTNET_PRIVATE:
                    keylabel = "Private key";
                    network = 'test';
                    networklabel = "Bitcoin Testnet";
                    break;
                case DOGE_PUBLIC:
                    keylabel = "Public key";
                    network = 'DOGEprod';
                    networklabel = "Dogecoin Mainnet";
                    break;
                case DOGE_PRIVATE:
                    keylabel = "Private key";
                    network = 'DOGEprod';
                    networklabel = "Dogecoin Mainnet";
                    break;
                case LTC_PUBLIC:
                    keylabel = "Public key";
                    network = 'LTCprod';
                    networklabel = "Litecoin Mainnet";
                    break;
                case LTC_PRIVATE:
                    keylabel = "Private key";
                    network = 'LTCprod';
                    networklabel = "Litecoin Mainnet";
                    break;
                default:
                    key = null;
                    console.log("Unknown key version");
            }
            Bitcoin.setNetwork(network);
        }
        $("#bip32_key_info_title").text(keylabel);
        $("#network_label").text(networklabel);

        console.log("key depth: " + key.depth);

        if (key.depth != 1) {
            alert("Non-standard key depth: should be 1, and it is " + key.depth + ", are you sure you want to use that?");
        }
		addressListForMessages.length = 0;
		addressesMatrix.length = 0;
		addressesMatrixReceive.length = 0;
		
        chains["receive"] = key.derive_child(RECEIVE_CHAIN);
        chains["change"] = key.derive_child(CHANGE_CHAIN);

        queue.append(generateAddress("receive", 0));
        queue.append(generateAddress("change", 0));

    };

    function onInput(id, func) {
        $(id).bind("input keyup keydown keypress change blur", function() {
            if ($(this).val() != jQuery.data(this, "lastvalue")) {
                func();
            }
            jQuery.data(this, "lastvalue", $(this).val());
        });
        $(id).bind("focus", function() {
            jQuery.data(this, "lastvalue", $(this).val());
        });
    };

    var onUpdateSourceKey = function() {
        var source_key = $("#bip32_source_key").val();
        useNewKey(source_key);
    }




    $(document).on("click", ".open-qroverlay", function() {
        var myAddress = $(this).data('addr');
        console.log("QR-->" + myAddress);
        $("#qraddr").text(myAddress);

        var qrCode = qrcode(5, 'H');
        var text = "bitcoin:" + myAddress;
        text = text.replace(/^[\s\u3000]+|[\s\u3000]+$/g, '');
        qrCode.addData(text);
        qrCode.make();
        $('#genAddrQR').html(qrCode.createImgTag(4));

    });

    $(document).on("click", ".open-sendMsgFrom", function() {
        document.getElementById("sgMsg").value = '';
        document.getElementById("sgMsgHidden").value = '';
        document.getElementById("sgAddr").value = '';
        document.getElementById("sgRoot").value = '';
        document.getElementById("sgChain").value = '';
        document.getElementById("sgIndex").value = '';
        
        var myAddress = $(this).data('addr');
        var myRoot = 0;
        var myChainText = $(this).data('chain');
        var myChain = '';
        if(myChainText == "receive"){
        	myChain = 0;
		}
			else
		{
        	myChain = 1;
		}
        var myIndex = $(this).data('index');
        console.log("-->" + myAddress);
        console.log("-->" + myRoot);
        console.log("-->" + myChain);
        console.log("-->" + myIndex);
        
        document.getElementById("sgAddr").value = myAddress;
        document.getElementById("sgRoot").value = Number(myRoot);
        document.getElementById("sgChain").value = Number(myChain);
        document.getElementById("sgIndex").value = Number(myIndex);

		$('#myTab a[href="#sign"]').tab('show');
		$('html, body').animate({scrollTop:0}, 'slow');
    });


/**
 * Sorts an array of json objects by some common property, or sub-property.
 * @param {array} objArray
 * @param {array|string} prop Dot-delimited string or array of (sub)properties
 */
// function sortJsonArrayByProp(objArray, prop){
//     if (objArray && objArray.constructor===Array){
//         var propPath = (prop.constructor===Array) ? prop : prop.split(".");
//         objArray.sort(function(a,b){
//             for (var p in propPath){
//                 if (a[propPath[p]] && b[propPath[p]]){
//                     a = a[propPath[p]];
//                     b = b[propPath[p]];
//                 }
//             }
//             // convert numeric strings to integers
//             a = a.match(/^\d+$/) ? +a : a;
//             b = b.match(/^\d+$/) ? +b : b;
//             return ( (a < b) ? -1 : ((a > b) ? 1 : 0) );
//         });
//     }
// };


	var getTransactionHistory = function(lower, upper)
	{
		var transactionHistoryMatrix = [];
		document.getElementById("transactionDisplayList").innerHTML = '';
// 		app.displayStatus('Getting Transactions');
		var numAddresses = addressesMatrix.length;
// 		alert(numAddresses);
		var queryString = serverURL;
		queryString = queryString.concat('/addrs/');
		var i;
		for (i = 0; i < addressesMatrix.length; i++)
		{
			queryString = queryString.concat(addressesMatrix[i]);
			if(i !== addressesMatrix.length - 1)
			{
				queryString = queryString.concat(',');
			}
		}
		queryString = queryString.concat('/txs?from='+lower+'&to='+upper);
		document.getElementById("historyQueryString").innerHTML = queryString;
		var j;
		var k;
		var transType;
		$.get(queryString)
			.done
			(
				function(data)
				{
					var arr = JSON.stringify(data);
					document.getElementById("historyQueryStringResults").innerHTML = arr;
// 					sortJsonArrayByProp(arr, "items.time");
// 					document.getElementById("historyQueryStringResultsSorted").innerHTML = arr;

					$.each(data.items, function(index, value){
						if(value.possibleDoubleSpend !== true)
						{
							var epochDate = value.time*1000;
// 								alert("epoch\n"+epochDate);
							var dateTimeString = moment(epochDate).format("YYYY-MM-DD HH:mm");
							if(dateTimeString == 'Invalid date')
							{
								dateTimeString = 'Not confirmed yet';
							}
// 								alert("WTFFF");
							var transType = '';
							var tempValueVinMatch = 0;
							var tempValueVinTotal = 0;
							var tempValueOutMatch = 0;
							var tempValueOutChange = 0;
							var tempValueOutTotal = 0;
							var totalTransacted = 0;
							var fee = 0;
							var displayType = '';
							var displayWord = '';
							var isUnconfirmed = '';

							$.each(value.vin, function(index, value){
								tempValueVinTotal = tempValueVinTotal + value.valueSat;
								for(j = 0 ; j < numAddresses; j++)
								{	
// 									alert(tempValueVinTotal);
									if(addressesMatrix[j].toString() === value.addr.toString())
									{
										transType = "SENT";
// 										alert('matchvin');
										tempValueVinMatch = tempValueVinMatch + value.valueSat;
									}
								}
							});
							$.each(value.vout, function(index, value){
								var sats = stringToSatoshis(value.value.toString());
// 									alert(sats);
								tempValueOutTotal = tempValueOutTotal + sats;
								for(j = 0 ; j < numAddresses; j++)
								{	
// 									alert(tempValueOutTotal);
									if(addressesMatrix[j].toString() === value.scriptPubKey.addresses.toString() && transType !== "SENT")
									{
										transType = "RECEIVED";
// 										alert('matchvout');
										tempValueOutMatch = tempValueOutMatch + sats;
									}else if(addressesMatrix[j].toString() === value.scriptPubKey.addresses.toString() && transType === "SENT")
									{
										transType = "SENT_WITH_CHANGE";
										tempValueOutMatch = tempValueOutMatch + sats;
									}
								}
							});
							fee = tempValueVinTotal - tempValueOutTotal;
// 								alert(transType);
							if(transType === "SENT")
							{
// 									alert("tvVinM\n"+tempValueVinMatch);
// 									alert("fee\n"+fee);
								totalTransacted = tempValueOutTotal + fee;
// 									alert("totalTrans\n"+totalTransacted);
								displayType = "sent";
								displayWord = "SENT";
							}else if(transType === "RECEIVED"){
// 									alert("tvVoutM\n"+tempValueOutMatch);
								totalTransacted = tempValueOutMatch;
// 									alert("totalTrans\n"+totalTransacted);
								displayType = "received";
								displayWord = "RECEIVED";
							}else if(transType === "SENT_WITH_CHANGE"){
// 								alert("tvVinM\n"+tempValueVinMatch);
// 									alert("tvVoutM\n"+tempValueOutMatch);
// 									alert("fee\n"+fee);

								totalTransacted = tempValueVinMatch - tempValueOutMatch; 
// 									alert("totalTrans\n"+totalTransacted);
								displayType = "sent";
								displayWord = "SENT";
							};
// 								alert(totalTransacted); 
							if(value.confirmations == 0)
							{
								var isUnconfirmed = 'UNCONFIRMED';
							}
							if(transType !== '')								
							{	
								transactionHistoryMatrix.push({txid: value.txid, RorS: displayType, RorSWord: displayWord, amount: totalTransacted, time: epochDate });
								var element = $(
									'<li class="'+displayType+' transactions-list">'
									+	'<strong><span class="left-sent-recv">'+displayWord+ '</span>&nbsp;<span class="right-amount">' + totalTransacted/100000000 + '</span></strong><br />'
									+	'<small>'+dateTimeString+'&nbsp;<strong>'+isUnconfirmed+'</strong></small><br />'
									+	'<small>'+value.txid+'</small><br />'
									+	'<hr><br />'
									+ '</li>'
									);
								$('#transactionDisplayList').append(element);
							}
						}
					});
				}
			);
// 		app.displayStatus('Ready');
		toastr.warning('My name is Inigo Montoya. You killed my father, prepare to die!');
		$('#transactionHistoryButton').attr('disabled',false);
	};
	



// Assumes the amount is displayed as an eight-digit after the comma float (string)	
	var stringToSatoshis = function(amountAsString)
	{
// 		alert(amountAsString);
		amountAsString = amountAsString.replace(/\./g,'');
// 		alert(amountAsString);
		var amountAsInteger = 0;
		var i;
		var amountArray = amountAsString.split("");
		amountArray.reverse();
// 		alert(amountArray.length);
		for(i = 0; i < amountArray.length; i++)
		{
			amountAsInteger = amountAsInteger + ((parseInt(amountArray[i]))*(Math.pow(10,i)));
// 			alert(amountAsInteger);
		}
		return amountAsInteger;
	}
	





    ///////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////
    // BIP32 SPECIFIC END
    ///////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////////////////


    $(document).ready(function() {


        
        $('#vrVerify').click(vrVerify);
        onInput('#vrSig', vrOnChangeSig);

        $('#sgType label input').on('change', sgOnChangeType);

        $('#vrSig').val('-----BEGIN BITCOIN SIGNED MESSAGE-----\n'
        +'This is an example of a signed message.\n'
        +'-----BEGIN SIGNATURE-----\n'
        +'<insert address here bizatch>\n'
        +'Gyk26Le4ER0EUvZiFGUCXhJKWVEoTtQNU449puYZPaiUmYyrcozt2LuAMgLvnEgpoF6cw8ob9Mj/CjP9ATydO1k=\n'
        +'-----END BITCOIN SIGNED MESSAGE-----');


        onInput("#bip32_source_key", onUpdateSourceKey);


		$('#transactionHistoryButton').on('click', function() {
			if($('#transactionHistoryButton').attr('disabled')){
			}else{
				$('#transactionHistoryButton').attr('disabled',true);
				$('#transactionDisplayListHeading').attr('hidden',false);
				getTransactionHistory(0,25);
			}
		});

        $('#submit_signed_transaction').on('click', function() {
        	submitTransaction();
		});

        $('#restore_wallet').on('click', function() {
            event.preventDefault();
            constructNewWalletRestore();
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
		});

        $('#generate_transaction').on('click', function() {
        	document.getElementById('output_transaction').value = '';
//         	document.getElementById('device_signed_transaction').value = '';
//         	document.getElementById('ready_to_transmit').value = '';
        	genTransaction();
        	
        	
		});

        $('#prep_for_device').click(prepForSigning);
        $('#sign_transaction_with_device').click(sendTransactionForSigning);
        
        $('#sgSignDevice').on('click', function() {
        	event.preventDefault();
        	signMessageWithDevice();
            pausecomp(10);        	
            hidWriteRawData(deviceCommands.button_ack);
        });

//         $('#sgSignDevice').click(signMessageWithDevice);



        ///////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////
        // LOCKBOX SPECIFIC ON READY
        ///////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////

        //         console.log( "ready!" );
        pluginLoaded(); //  enter js: detect if plugin present. 

//         makeListItems("#load_wallet_list", "load_wallet_", "Load Wallet", 6, 0);
        makeListItems("#get_address", "get_address_", "Get Address", 10, 0);
        makeListItems("#delete_wallet_list", "delete_wallet_", "Delete Wallet", 6, 0);
        makeListItems("#new_wallet_list", "new_wallet_", "New Wallet", 26, 0);


        $('#status').on('click', function() {
            hidScan();
        });

        $('#status_button').on('click', function() {
            hidScan();
        });
 
        $('#feature').on('click', function() {
        var r = confirm("RUN FLASHING APP AFTER CONFIRMING. If an alert about Network Interface comes up, please just cancel the alert.");
			if (r == true) {
				hidAskFeature();
				console.log( "RESET HID WITH SPECIAL PACKET - REFLASH" );
			} else {
				;
			}            
        });

        $('#PutAll').on('click', function() {
            event.preventDefault();
            putAll();
        });


        $('#initialize').on('click', function() {
            event.preventDefault();
            initialize_protobuf_encode();
        });

        $('#raw_input_button').on('click', function() {
            event.preventDefault();
            var toSendRaw = document.getElementById('raw_input').value;
            
            console.log("RAW: " + toSendRaw);
            autoCannedTransaction(toSendRaw);
        });

        $('#direct_load_wallet').on('click', function() {
            event.preventDefault();
            var walletToLoad = document.getElementById('direct_load_wallet_input').value;
            directLoadWallet(walletToLoad);
        });

        $('#entropy').on('click', function() {
            event.preventDefault();
            var entropy_value = document.getElementById('entropy_input').value;
            getEntropy(entropy_value);
        });

        $('#ping').on('click', function() {
            constructPing();
        });

        $('#format_storage').on('click', function() {
            hidWriteRawData(deviceCommands.format_storage);
        });

        $('#button_ack').on('click', function() {
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#button_cancel').on('click', function() {
            hidWriteRawData(deviceCommands.button_cancel);
        });

        $('#list_wallets').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.list_wallets);
        });

        $('#new_wallet').on('click', function() {
            hidWriteRawData(deviceCommands.new_wallet);
        });

        $('#new_wallet_default').on('click', function() {
            hidWriteRawData(deviceCommands.new_wallet_default);
        });

        $('#load_wallet_0').on('click', function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_0);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $('#load_wallet_1').on('click', function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_1);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $('#load_wallet_2').on('click', function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_2);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $('#load_wallet_3').on('click', function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_3);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $('#load_wallet_4').on('click', function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_4);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $('#load_wallet_5').on('click', function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_5);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $('#get_entropy_32_bytes').on('click', function() {
            hidWriteRawData(deviceCommands.get_entropy_32_bytes);
        });

        $('#autoCannedTransaction_1').on('click', function() {
            autoCannedTransaction(deviceCommands.sign_transaction_1);
        });

        $('#autoCannedTransaction_2').on('click', function() {
            autoCannedTransaction(deviceCommands.sign_transaction_2);
        });

        $('#autoCannedTransaction_10').on('click', function() {
            autoCannedTransaction(deviceCommands.sign_transaction_10);
        });

        $('#autoCannedTransaction_11').on('click', function() {
            autoCannedTransaction(deviceCommands.sign_transaction_11);
        });

        $('#autoCannedTransaction_12').on('click', function() {
            autoCannedTransaction(deviceCommands.sign_transaction_12);
        });

        $('#otp_ack').on('click', function() {
            hidWriteRawData(constructOTP());
        });

        $('#otp_cancel').on('click', function() {
            hidWriteRawData(deviceCommands.otp_cancel);
        });

        $('#pin_ack').on('click', function() {
            constructPIN();
        });

        $('#pin_cancel').on('click', function() {
            hidWriteRawData(deviceCommands.pin_cancel);
        });

        $('#delete_wallet_0').on('click', function() {
            hidWriteRawData(deviceCommands.delete_wallet_0);
            pausecomp(10);        	
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#delete_wallet_1').on('click', function() {
            hidWriteRawData(deviceCommands.delete_wallet_1);
            pausecomp(10);        	
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#delete_wallet_2').on('click', function() {
            hidWriteRawData(deviceCommands.delete_wallet_2);
            pausecomp(10);        	
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#delete_wallet_3').on('click', function() {
            hidWriteRawData(deviceCommands.delete_wallet_3);
            pausecomp(10);        	
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#delete_wallet_4').on('click', function() {
            hidWriteRawData(deviceCommands.delete_wallet_4);
            pausecomp(10);        	
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#delete_wallet_5').on('click', function() {
            hidWriteRawData(deviceCommands.delete_wallet_5);
            pausecomp(10);        	
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#get_device_uuid').on('click', function() {
            hidWriteRawData(deviceCommands.get_device_uuid);
        });


        $('#reset_lang').on('click', function() {
            hidWriteRawData(deviceCommands.reset_lang);
        });

//         $('#reset_16u2').on('click', function() {
//             hidWriteRawData(deviceCommands.reset_16u2);
//         });


        $('#scan_wallet').on('click', function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $('#rename_wallet_variable').on('click', function() {
            hidWriteRawData(constructRenameWallet());
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_action').on('click', function(event) {
            event.preventDefault();
            constructNewWallet();
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#device_restore_wallet_action').on('click', function(event) {
            event.preventDefault();
            constructDeviceRestoreWallet();
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#uuid').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.get_device_uuid);
        });

        $('#payments_toggle').click(function() {
            $('#payments_panel').slideToggle('fast', function() {
                // Animation complete.
            });
        });

        $('#txAddDest').click(txOnAddDest);
        $('#txRemoveDest').click(txOnRemoveDest);

        ///////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////
        // TO BE DEPRECATED
        ///////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////

        $('#new_wallet_0').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_0);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_1').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_1);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_2').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_2);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_3').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_3);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_4').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_4);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_5').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_5);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_6').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_6);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_7').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_7);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_8').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_8);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_9').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_9);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_10').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_10);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_11').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_11);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_12').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_12);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_13').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_13);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_14').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_14);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_15').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_15);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_16').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_16);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_17').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_17);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_18').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_18);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_19').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_19);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_20').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_20);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_21').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_21);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_22').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_22);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_23').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_23);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_24').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_24);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });

        $('#new_wallet_25').on('click', function(event) {
            event.preventDefault();
            hidWriteRawData(deviceCommands.new_wallet_25);
            pausecomp(10);
            hidWriteRawData(deviceCommands.button_ack);
        });



        $(document).on("click", "#wallet_0", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_0);
//             check 34
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_0").innerHTML;
//             check field loaded
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_1", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_1);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_1").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_2", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_2);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_2").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_3", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_3);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_3").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_4", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_4);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_4").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_5", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_5);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_5").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_6", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_6);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_6").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_7", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_7);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_7").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_8", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_8);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_8").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_9", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_9);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_9").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_10", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_10);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_10").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_11", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_11);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_11").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_12", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_12);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_12").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_13", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_13);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_13").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_14", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_14);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_14").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_15", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_15);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_15").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_16", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_16);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_16").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_17", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_17);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_17").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_18", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_18);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_18").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_19", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_19);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_19").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_20", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_20);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_20").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_21", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_21);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_21").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_22", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_22);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_22").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_23", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_23);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_23").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_24", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_24);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_24").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#wallet_25", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.load_wallet_25);
            document.getElementById("loaded_wallet_name").innerHTML = document.getElementById("name_25").innerHTML;
            pausecomp(10);
            hidWriteRawData(deviceCommands.scan_wallet);
        });

        $(document).on("click", "#GetAll", function() {
            event.preventDefault();
            hidWriteRawData(deviceCommands.GetAllWallets);
        });

        ///////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////
        // LOCKBOX SPECIFIC ON READY END
        ///////////////////////////////////////////////////////////////////////////////////////
        ///////////////////////////////////////////////////////////////////////////////////////


	/* broadcast a transaction */

	$("#rawSubmitBtn").click(function(){
		rawSubmitDefault(this);
	});



	function rawSubmitDefault(btn){ 
		var thisbtn = btn;		
		$(thisbtn).val('Please wait, loading...').attr('disabled',true);
 		$.ajax({
            type: "POST",
            url: "/api/tx/send",
            data: JSON.stringify({"rawtx":$('#rawTransaction').val()}),
            contentType: "application/json",
            dataType: "application/json",
            success: function(data) {
            	toastr.warning('SUCCESS!');
//             	var returnInfo = JSON.stringify(data);
//             	console.log("returned: " + returnInfo);
// 				$("#rawTransactionStatus").html(unescape($(data).find("response").text()).replace(/\+/g,' ')).removeClass('hidden');
// 				if(returnInfo.find("txid").text()==1){
// 					$("#rawTransactionStatus").addClass('alert-success').removeClass('alert-danger').removeClass('hidden');
//             		$("#rawTransactionStatus").html('txid: '+returnInfo.slice(9,35)+'<br>'+ returnInfo.slice(36,66) +'<br>'+returnInfo.slice(65,73));
// 				} else {
// 					$("#rawTransactionStatus").addClass('alert-danger').removeClass('alert-success').prepend('<span class="glyphicon glyphicon-exclamation-sign"></span> ');
// 				}
			},
 			error: function(data) {
 				toastr.warning('error');
// 				document.getElementById("temp_results").innerHTML = JSON.stringify(data);
// 				$("#rawTransactionStatus").addClass('alert-danger').removeClass('alert-success').removeClass("hidden").html(" Error").prepend('<span class="glyphicon glyphicon-exclamation-sign"></span>');
			}        
		});
	}



        monitorUSBHID();


    });



})(jQuery);