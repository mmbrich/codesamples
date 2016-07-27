<?php 

namespace App\Http\Controllers;

use App\User;
use App\Utils;
use App\Events;
use App\Http\Requests;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Storage;
use JavaScript;
use Input;
use Validator;
use Event;
use Purifier;
use File;
use Podio as Podio;


class TransformController extends Controller
{

    public $fileName;
    public $filePath;
    public $fullFile;
    public $lastFile = null;
    public $fileType;
    public $templateId;

    private $unoPath = '/usr/bin';

    public function transformDocument($templateId, $purify = false, $tidy = false) {
	\Log::info("Transforming Document");
        $user = $this->getUser();
        $podioUser = $user->getStatus();
	$this->templateId = $templateId;
	$html = '';

	$this->filePath = session('upload_path');
	$this->fileName = session('upload_file');
	$this->fullFile = $this->filePath.$this->fileName;
	\Log::info($this->fullFile);

	// 1) move to our own directory
	$dirName = storage_path()."/uploads/fileTransform_".$user->id;
	\Log::info($dirName);

	if(is_dir($dirName)) {
        	File::deleteDirectory($dirName);
	}

        File::makeDirectory($dirName);

	$newFile = $dirName."/".$this->fileName;
	rename($this->fullFile,$newFile);

	$this->fullFile = $newFile;
	$this->filePath = $dirName;

	// 2) Get file type and start doc transform
	$ftype = $this->getFileType();

	\Log::info($ftype);
	if($ftype == "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || $ftype == "application/zip") {
		\Log::info("MSDoc File");
		$this->fileType = "docx";
		//$this->docx2odt();
		//$this->odt2pdf();
		\Log::info("Doc2pdf");
		$this->docx2pdf5();
		\Log::info("PDF2Html");
		$html = $this->pdf2htmlGufy();
		\Log::info("Inject Images");
		$html = $this->injectImages($html);
		\Log::info("Process Import");
		$html = $this->processImport($html);
	} else if ($ftype == "application/pdf") {
		\Log::info("PDF File");
		$this->fileType = "pdf";
		//$html = $this->pdf2html();
		$html = $this->pdf2htmlGufy();
		//$html = $this->embedImages($html);
		$html = $this->injectImages($html);
		$html = $this->processImport($html);
	} else if ($ftype == "text/html") {
		\Log::info("HTML File");
		$this->fileType = "html";
		//$html = $this->pdf2html();
		$html = file_get_contents($this->fullFile);
		//$html = $this->embedImages($html);
		$html = $this->injectImages($html);
	}

	if($purify)
		$html = $this->purifyHTML($html);

	if($tidy) 
		$html = $this->tidyHTML($html);

        File::deleteDirectory($dirName);

	return $html;
    }

    public function getFileType() {
	return mime_content_type($this->fullFile);
    }

    public function runConverter($cmd) {
	// rr cute uno converter
	if($this->lastFile == null) {
		$command = $this->unoPath."/".$cmd." ".$this->fullFile;
	} else {
		\Log::info("Last File!!");
		$command = $this->unoPath."/".$cmd." ".$this->filePath."/".$this->lastFile;
	}
	\Log::info("Converting with: ".$command." using passthru()");
	passthru($command);
    }

    public function docxStats() {
	\Log::info("DOCX Stats");
        $docx = new \Phpdocx\Transform\TransformDocAdvLibreOffice();
        $docStats = $docx->getStatistics($this->fullFile);
	\Log::info($docStats);
    }

    public function docx2html() {
	\Log::info("LibreOffice/PHPDOCX Docx->Html Converter");
        $newFile = preg_replace('/\.'.$this->fileType.'/i','.html',$this->fileName);

        $docx = new \Phpdocx\Transform\TransformDocAdvLibreOffice();
        $docStats = $docx->getStatistics($this->fullFile);
        $docx->transformDocument($this->fullFile, $newFile, null, array('method='=>'direct'));
        $html = file_get_contents($this->filePath."/".$newFile);

	$this->lastFile = $newFile;
	return $html;
    }

    public function docx2odt() {
        $newFile = preg_replace('/\.'.$this->fileType.'/i','.odt',$this->fileName);
	$cmd = "doc2odt";
	$this->runConverter($cmd);
	$this->lastFile = $newFile;
    }

    public function docx2pdf5() {
        $newFile = preg_replace('/\.'.$this->fileType.'/i','.pdf',$this->fileName);
	$cmd = "cd ".$this->filePath." && /opt/libreoffice5.2/program/soffice --headless --convert-to pdf ".$this->fileName;
	$pt = exec($cmd);
	$this->lastFile = $newFile;
    }

    public function odt2pdf() {
        $newFile = preg_replace('/\.'.$this->fileType.'/i','.pdf',$this->fileName);
	$cmd = "odt2pdf";
	$this->runConverter($cmd);
	$this->lastFile = $newFile;
    }

    public function docx2pdf() {
	// 1) soffice docx2pdf
        $newFile = preg_replace('/\.'.$this->fileType.'/i','.pdf',$this->fileName);
	$cmd = "doc2pdf";
	$this->runConverter($cmd);
	$this->lastFile = $newFile;
    }

    public function pdf2html() {
	// 1) soffice pdf2html
        $newFile = preg_replace('/\.'.$this->fileType.'/i','.html',$this->fileName);
	$cmd = "pdftohtml";
	$this->runConverter($cmd);
	$this->lastFile = $newFile;

	$html = file_get_contents($this->filePath."/".$newFile);
	return $html;
    }

    public function pdf2htmlGufy() {
	\Log::info("PDF2HTML Via GUFY");
	// 1) Gufy pdf2html
        $newFile = preg_replace('/\.'.$this->fileType.'/i','.html',$this->fileName);
        $options=array(
        	'singlePage'=>true,
        	'imageJpeg'=>true,
        	'ignoreImages'=>false,
        	'zoom'=>1.356900,
        	'noFrames'=>true,
        );
	\Log::info($options);

	if(isset($this->lastFile))
        	$pdf = new \Gufy\PdfToHtml\Base($this->filePath."/".$this->lastFile,$options);
	else 
        	$pdf = new \Gufy\PdfToHtml\Base($this->fullFile,$options);

        $fp = $pdf->generate();

	$html = file_get_contents($this->filePath."/".$newFile);
	return $html;
    }

    public function sanitizeHTML($input) {
	\Log::info("Full Sanitize");
	$output = $this->tidyHTML($input);
	$input = $this->purifyHTML($output);
	return $input;
    }

    public function tidyHTML($input) {
	\Log::info("Tidy HTML Sanitize");
    	$tmpfile = "template_tmpfile.html";
    	file_put_contents($this->filePath."/".$tmpfile,$input);
    	$cmd = '/usr/bin/tidy -m -config '.config_path().'/tidy.config '.$this->filePath.$tmpfile;
    	passthru($cmd);
    	$html = file_get_contents($this->filePath."/".$tmpfile);
	return $html;
    }

    public function processImport($html) {
	// We're going to attempt to remove the page markers
	// on the page and inject our own page wrappers for 
	// the templating engine.
        $user = $this->getUser();
	\Log::info("Mangling imported file to fit into template...");

	$pageStart = <<<EOF
<page contenteditable="false" data-pagenum="PAGE_NUM" data-imported="true" layout="portrait" size="A4" unselectable="on">
  <div class="header" contenteditable="false" unselectable="on">
    <div class="headercontent" contenteditable="false" unselectable="on">
    </div>
  </div>

  <div class="content" contenteditable="false" unselectable="off">
    <div class="pagecontent" contenteditable="true">
EOF;

	$pageEnd = <<<EOF
    </div>
  </div>

  <div class="footer" contenteditable="false" unselectable="on">
    <div class="footercontent" contenteditable="false" unselectable="on">
    </div>
  </div>
</page>
EOF;

	preg_match_all('/(.*)<!-- Page \d* -->/sU', $html, $matches);
	$newCss = Storage::disk('source')->get('Assets/blankcss_1.0.0.css');

	$newPages = array();
	$pageNum = 1;
	$pages = '';
	foreach($matches[0] as $index=>$oldPage) {
		if($index != 0) {
			$page = preg_replace('/<!-- Page \d* -->/','',$oldPage);
			$page = preg_replace('/<a name="\d*"><\/a>/','',$page);
			$pages .= preg_replace('/PAGE_NUM/',$pageNum, $pageStart);
			$pages .= $page;
			$pages .= $pageEnd;
			$pageNum++;
		}
	}	
	$html = $newCss.$pages;
	\Log::info("Saving images to disc for serving...");

        libxml_use_internal_errors(true);
        $doc = new \DOMDocument();
	$doc->encoding = 'utf-8';

	try {
        	$doc->loadHTML( utf8_decode($html) );
	} catch(\Exception $e) {
		// We should sanitize and try again before fail
		\Log::error("DOMDoc CRASH!!");
		return $html;
	}
        $pages = $doc->getElementsByTagName('page');
	$xpath = new \DOMXpath($doc);
	$expression = './/div[contains(concat(" ", normalize-space(@class), " "), " pagecontent ")]';
	foreach ($xpath->evaluate($expression) as $div) {
		$contents[] = $div;
	}
	foreach($pages as $pageIndex=>$page) {
		$pageContents = $contents[$pageIndex];
		$images = $page->getElementsByTagName("img");
		$backgroundHeight = 0;
		$page->setAttribute("data-imported", "true");

		// set background image if found;
		foreach($images as $imgIndex=>$image) {
			if($image->getAttribute("alt") == "background image") {
				\Log::info("Doc importer: found background image");
				$styles = $pageContents->getAttribute('style');
				$backgroundHeight = "1134px"; //$image->getAttribute('height');
				$pageContents->setAttribute('style', 'height: '.$backgroundHeight.'; background-image: url("'.url('/').$image->getAttribute("src").'");background-repeat: no-repeat;background-position: left top; '.$styles);
				$image->parentNode->removeChild($image);
			}
		}

		// Remove page-div element, preserving child nodes
		$div = $doc->getElementById("page".($pageIndex+1)."-div");
		$fragment = $doc->createDocumentFragment();

		if($div) {
		  while ($div->childNodes->length > 0) {
		    $fragment->appendChild($div->childNodes->item(0));
		  }
		  $div->parentNode->replaceChild($fragment, $div);
		}
	}

        $html = $doc->saveHTML();
	return $html;
    }

    public function injectImages($html) {
        $user = $this->getUser();
	\Log::info("Saving images to disc for serving...");

        libxml_use_internal_errors(true);
        $doc = new \DOMDocument();
	try {
        	$doc->loadHTML($html);
	} catch(\Exception $e) {
		// We should sanitize and try again before fail
		\Log::error("DOMDoc CRASH!!");
		return $html;
	}

        $images = $doc->getElementsByTagName('img');
        foreach ($images as $image) {
        	\Log::info("Image:");
                if(file_exists($this->filePath."/".$image->getAttribute('src'))) {
			$imgName = $image->getAttribute('src');
			$dirName = storage_path()."/images/".$user->id."/".$this->templateId."/";

			if(!is_dir($dirName)) {
				\Log::info("Creating directory for user images");
        			File::makeDirectory($dirName, 0775, true);
			}

                        \Log::info("Storing local file: ".$imgName);
			if(!File::move($this->filePath."/".$imgName, $dirName.$imgName)) {
				\Log::error("Failed to move file, embedding image");
                        	$b64image = base64_encode(file_get_contents($this->filePath."/".$imgName));
                        	$image->setAttribute('src','data:image/jpg;base64,'.$b64image);
			} else {
				\Log::info("File moved, updating document");
                        	$image->setAttribute('src','/template/'.$this->templateId."/image/".$imgName);
			}
                } // else ?  web images?
        }

        $html = $doc->saveHTML();
	return $html;
    }

    public function embedImages($html) {
	\Log::info("Embedding images into file!");

        libxml_use_internal_errors(true);
        $doc = new \DOMDocument();
	try {
        	$doc->loadHTML($html);
	} catch(\Exception $e) {
		// We should sanitize and try again before fail
		\Log::error("DOMDoc CRASH!!");
		return $html;
	}

        $images = $doc->getElementsByTagName('img');
        foreach ($images as $image) {
        	\Log::info("Image:");
                if(file_exists($this->filePath."/".$image->getAttribute('src'))) {
                        \Log::info("Base 64 Encoding local file: ".$image->getAttribute('src'));
                        $b64image = base64_encode(file_get_contents($this->filePath."/".$image->getAttribute('src')));
                        $image->setAttribute('src','data:image/jpg;base64,'.$b64image);
                } else {
                        \Log::info("External Image Attrib CURL(): ".$image->getAttribute('src'));
                        $ch = curl_init();
                        curl_setopt($ch, CURLOPT_URL, $image->getAttribute('src'));
                        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                        //curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                        $thisImage = curl_exec($ch);

                        # get the content type
                        $mtype = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
                        curl_close($ch);

                        if($mtype != "text/html; charset=UTF-8") {
                        	\Log::info($mtype);
                        	\Log::info($thisImage);
                        	$b64image = base64_encode($thisImage);
                 		$image->setAttribute('src','data:'.$mtype.';base64,'.$b64image);
			} else {
                        	\Log::info($mtype);
                        	\Log::info("Image behind authwall, not loading");
			}
                }
        }
        try {
        	$title = $doc->getElementsByTagName('title')->item(0);
        	$title->nodeValue = "Print for PODIO by TECHeGO -- http://print.thatapp.io";
        }catch(\Exception $e) {
        	//Event::fire(new \App\Events\DevError($user->id, $e->getMessage(), "TemplateController::edit()->mangle-title"));
        }
        $html = $doc->saveHTML();
	return $html;
    }

    public function purifyHTML($input) {
	\Log::info("Purifier() HTML Sanitize");
	Purifier::clean($input);
	return $input;
    }
}
