using System.Diagnostics;
using Casus_Security.Model;

namespace Casus_Security.Classes
{
	internal class OpenBrowser
	{
		public static void OpenLauncher()
		{
			string webFolderPath = @"C:\Users\casli\source\Security\Casus Security\Casus Security\web";

			string[] htmlFiles = Directory.GetFiles(webFolderPath, "*.html");

			if (htmlFiles.Length > 0)
			{
				string firstHtmlFile = htmlFiles[0];
				Console.WriteLine("Launching web interface....");
				LaunchPage(firstHtmlFile);

				
			}
			else
			{
				Console.WriteLine("No .html files found in the 'web' folder.");
			}
		}

		public static void LaunchPage(string pagePath)
		{
			try
			{
				if (File.Exists(pagePath))
				{
					Process browserProcess = new Process
					{
						StartInfo = new ProcessStartInfo
						{
							FileName = pagePath,
							UseShellExecute = true // This tells the OS to open the file with the default browser
						}
					};
					
					IPScanner scanner = new();
					scanner.ImportIpsFromNetstat();

					browserProcess.Start();
					System.Threading.Thread.Sleep(3000);

					while (true)
					{
						Console.WriteLine("Updating IP's...");

						List<IP> ips = scanner.GetIpList();
						
						foreach (string ip in ips) 
						{ 
							Console.WriteLine(ip);
						}

						System.Threading.Thread.Sleep(2000);
					}

					//browserProcess.WaitForExit();
				}
				else
				{
					Console.WriteLine("The file does not exist: " + pagePath);
				}
			}
			catch (Exception ex)
			{
				Console.WriteLine("Error opening the browser: " + ex.Message);
			}
		}
	}
}
