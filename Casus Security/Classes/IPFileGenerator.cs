using Casus_Security.Model;
using Newtonsoft.Json;
using System.IO;

internal class IPFileGenerator
{
	private string filePath;

	public IPFileGenerator(string filePath)
	{
		this.filePath = filePath;
	}

	public void GenerateIPFile(List<IP> ipList)
	{
		try
		{
			File.WriteAllText(filePath, string.Empty);
			string json = JsonConvert.SerializeObject(ipList, Newtonsoft.Json.Formatting.Indented);
			File.WriteAllText(filePath, json);
		}
		catch (Exception ex)
		{
			Console.WriteLine("An error occurred while generating the JSON file: " + ex.Message);
		}
	}
}
