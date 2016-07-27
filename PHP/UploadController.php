<?php namespace App\Http\Controllers;

use App\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Podio as Podio;

use App\Http\Requests;
use JavaScript;
use Input;
use Validator;


class UploadController extends Controller
{
    public function upload(Request $request)
    {
	//\Log::info("uploading");
	//\Log::info($request);
	if( $request->hasFile('file') ) {
		//\Log::info($request);
        	$file = $request->file('file');
		//\Log::info($file);
		$fileName = $file->getClientOriginalName();
		$extension = $file->getClientOriginalExtension();
		//\Log::info($fileName);
		//\Log::info($extension);

        	if(trim($extension) != "docx" &&
		  trim($extension) != "pdf" &&
		  trim($extension) != "html") {
			return json_encode(array("status"=>"fail","details"=>"Invalid File Type"));
		}

        	$path = base_path().'/storage/uploads/';
		$newName = preg_replace("/[^a-z0-9\.]/", "", strtolower($fileName));
        	$file = $file->move($path, $newName);
		session()->put('upload_path', $path);
		session()->put('upload_file', $newName);

		return json_encode(array("status"=>"OK"));
	} else
		return json_encode(array("status"=>"fail","details"=>"Failed to upload file"));
    }
}
