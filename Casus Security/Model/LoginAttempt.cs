namespace Casus_Security.Model
{
    public class LoginAttempt
    {
		private string _timestamp { get; set; }
		private string _username { get; set; }
		private IP _ip { get; set; }
		private string _status { get; set; }

		public string Timestamp 
		{
			get { return _timestamp; }
			set { _timestamp = value; }
		}
		public string UserName
		{
			get { return _username; }
			set { _username = value; }
		}
		public IP Ip
		{
			get { return _ip; }
			set { _ip = value; }
		}
		public string Status
		{
			get { return _status; }
			set { _status = value; }
		}

		public LoginAttempt(string timestamp, string username, IP ip, string status) 
		{ 
			_timestamp = timestamp;
			_username = username;
			_ip = ip;
			_status = status;
		}

		public override string ToString()
		{
			return $"Timestamp: {Timestamp}, Username: {UserName}, Status: {Status}, IP: {Ip.ForeignAddress}";
		}

		public LoginAttempt() { }
	}
}
