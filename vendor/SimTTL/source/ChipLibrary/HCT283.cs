// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

using SimBase;

namespace ChipLibrary
{
    /// <summary>
    /// Class definition of the logic chip 74HCT283.
    /// </summary>
    public class HCT283 : BaseElement
    {
        // Datashet: https://www.ti.com/lit/ds/symlink/cd74hct283.pdf

        private const double TYP_PROPAGATION_DELAY = 21;

        #region Input Pins
        public Pin CIN;

        public Pin A0;
        public Pin A1;
        public Pin A2;
        public Pin A3;

        public Pin B0;
        public Pin B1;
        public Pin B2;
        public Pin B3;
        #endregion Input Pins

        #region Output Pins
        public Pin COUT;
        public Pin S0;
        public Pin S1;
        public Pin S2;
        public Pin S3;
        #endregion Output Pins

        #region Constructors
        /// <summary>
        /// Creates the instance without net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT283(string Name) : this(Name, null, null, null, null, null, null, null, null, null) { }

        /// <summary>
        /// Creates the instance including input net connections.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        public HCT283(string Name, Net NetCIN, Net NetA0, Net NetA1, Net NetA2, Net NetA3, Net NetB0, Net NetB1, Net NetB2, Net NetB3) : base(Name)
        {
            this.Power[0] = new Pin(this, "VCC", "16");
            this.Ground[0] = new Pin(this, "GND", "8");

            this.CIN = new Pin(this, "CIN", "7", LineMode.In, SignalState.L, NetCIN);
            this.A0 = new Pin(this, "A0",  "5", LineMode.In, SignalState.L, NetA0);
            this.A1 = new Pin(this, "A1",  "3", LineMode.In, SignalState.L, NetA1);
            this.A2 = new Pin(this, "A2", "14", LineMode.In, SignalState.L, NetA2);
            this.A3 = new Pin(this, "A3", "12", LineMode.In, SignalState.L, NetA3);
            this.B0 = new Pin(this, "B0",  "6", LineMode.In, SignalState.L, NetB0);
            this.B1 = new Pin(this, "B1",  "2", LineMode.In, SignalState.L, NetB1);
            this.B2 = new Pin(this, "B2", "15", LineMode.In, SignalState.L, NetB2);
            this.B3 = new Pin(this, "B3", "11", LineMode.In, SignalState.L, NetB3);

            this.COUT = new Pin(this, "COUT", "9", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.S0 = new Pin(this, "S0",  "4", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.S1 = new Pin(this, "S1",  "1", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.S2 = new Pin(this, "S2", "13", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);
            this.S3 = new Pin(this, "S3", "10", LineMode.Out, SignalState.L, TYP_PROPAGATION_DELAY);

            Inputs = new Pin[3][];
            SetPinArray(Inputs, 0, this.CIN);
            SetPinArray(Inputs, 1, new Pin[] { this.A0, this.A1, this.A2, this.A3 });
            SetPinArray(Inputs, 2, new Pin[] { this.B0, this.B1, this.B2, this.B3 });

            Outputs = new Pin[2][];
            SetPinArray(Outputs, 0, this.COUT);
            SetPinArray(Outputs, 1, new Pin[] { this.S0, this.S1, this.S2, this.S3 });
        }
        #endregion Constructors

        #region Public Methods
        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);

            int a = 0;
            int b = 0;
            for (int i = 0; i < 4; i++)
            {
                if (Inputs[1][i].State == SignalState.H)
                    a += 1 << i;
                if (Inputs[2][i].State == SignalState.H)
                    b += 1 << i;
            }
            int x = a + b;
            if (CIN.State == SignalState.H)
                x++;

            for (int i = 0; i < 4; i++)
            {
                if ((x & (1 << i)) == 0)
                    Outputs[1][i].NewOutState = SignalState.L;
                else
                    Outputs[1][i].NewOutState = SignalState.H;
            }
            if ((x & 0xF0) == 0)
                COUT.NewOutState = SignalState.L;
            else
                COUT.NewOutState = SignalState.H;
        }
        #endregion Public Methods

    }
}
