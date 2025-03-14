using System;
using System.IO;
using System.Net;
using System.Diagnostics;
using System.Threading.Tasks;

public class WebServer
{
	private static string webFolderPath = @"C:\Users\casli\source\Security\Casus Security\Casus Security\web";
	private static bool isBrowserOpen = true;

	public static void OpenLauncher()
	{
		if (Directory.Exists(webFolderPath))
		{
			Console.WriteLine("\nLaunching local webserver....\n");
			Start(); // Start local server
		}
		else
		{
			Console.WriteLine("Web folder not found!");
		}
	}

	public static async void Start()
	{
		HttpListener listener = new HttpListener();
		listener.Prefixes.Add("http://localhost:5000/");
		listener.Start();
		Console.WriteLine("Server started on: http://localhost:5000 \n");

		// Open the browser
		Process.Start(new ProcessStartInfo
		{
			FileName = "http://localhost:5000",
			UseShellExecute = true
		});

		_ = Task.Run(async () =>
		{
			while (true)
			{
				HttpListenerContext context = await listener.GetContextAsync();
				HttpListenerRequest request = context.Request;
				HttpListenerResponse response = context.Response;

				// Check for ping request
				if (request.Url.AbsolutePath == "/ping")
				{
					// Reset the isBrowserOpen flag if we get a ping
					isBrowserOpen = true;
					Console.WriteLine("Ping received: Browser is still open.");

					// Send a simple OK response to keep the connection alive
					response.StatusCode = 200;
					byte[] buffer = System.Text.Encoding.UTF8.GetBytes("OK");
					response.ContentLength64 = buffer.Length;
					response.OutputStream.Write(buffer, 0, buffer.Length);
					response.OutputStream.Close();
					continue;
				}

				string requestedFile = request.Url.AbsolutePath.TrimStart('/');
				if (string.IsNullOrEmpty(requestedFile))
					requestedFile = "index.html";

				string filePath = Path.Combine(webFolderPath, requestedFile);

				if (File.Exists(filePath))
				{
					string mimeType = GetMimeType(filePath);
					byte[] buffer = File.ReadAllBytes(filePath);

					response.ContentType = mimeType;
					response.ContentLength64 = buffer.Length;
					response.OutputStream.Write(buffer, 0, buffer.Length);
				}
				else
				{
					// Return 404 if file not found
					response.StatusCode = 404;
					byte[] buffer = System.Text.Encoding.UTF8.GetBytes("<h1>404 - File Not Found</h1>");
					response.ContentLength64 = buffer.Length;
					response.OutputStream.Write(buffer, 0, buffer.Length);
				}

				response.OutputStream.Close();
			}
		});
	}

	private static string GetMimeType(string filePath)
	{
		string extension = Path.GetExtension(filePath).ToLower();
		return extension switch
		{
			".html" => "text/html",
			".css" => "text/css",
			".js" => "application/javascript",
			".png" => "image/png",
			".jpg" => "image/jpeg",
			".jpeg" => "image/jpeg",
			".gif" => "image/gif",
			".svg" => "image/svg+xml",
			".ico" => "image/x-icon",
			".json" => "application/json",
			".txt" => "text/plain",
			_ => "application/octet-stream"
		};
	}
}
