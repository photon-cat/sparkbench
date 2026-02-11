namespace SimTTL
{
    partial class frmSearchSignal
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.tbSearchText = new System.Windows.Forms.TextBox();
            this.lbPossibleSignals = new System.Windows.Forms.ListBox();
            this.SuspendLayout();
            // 
            // tbSearchText
            // 
            this.tbSearchText.Location = new System.Drawing.Point(12, 136);
            this.tbSearchText.Name = "tbSearchText";
            this.tbSearchText.Size = new System.Drawing.Size(150, 20);
            this.tbSearchText.TabIndex = 0;
            this.tbSearchText.TextChanged += new System.EventHandler(this.tbSearchText_TextChanged);
            // 
            // lbPossibleSignals
            // 
            this.lbPossibleSignals.FormattingEnabled = true;
            this.lbPossibleSignals.Location = new System.Drawing.Point(12, 2);
            this.lbPossibleSignals.Name = "lbPossibleSignals";
            this.lbPossibleSignals.Size = new System.Drawing.Size(150, 121);
            this.lbPossibleSignals.TabIndex = 1;
            this.lbPossibleSignals.MouseDoubleClick += new System.Windows.Forms.MouseEventHandler(this.lbPossibleSignals_MouseDoubleClick);
            // 
            // frmSearchSignal
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(174, 168);
            this.Controls.Add(this.lbPossibleSignals);
            this.Controls.Add(this.tbSearchText);
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.FixedToolWindow;
            this.Name = "frmSearchSignal";
            this.StartPosition = System.Windows.Forms.FormStartPosition.CenterParent;
            this.Text = "Search Signal";
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.TextBox tbSearchText;
        private System.Windows.Forms.ListBox lbPossibleSignals;
    }
}